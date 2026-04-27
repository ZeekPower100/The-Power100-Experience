#!/usr/bin/env node
/**
 * Sync every IC contributor's headshot from its canonical P100 page.
 *
 * Strategy (revised):
 *   1. ONE bulk SSH call dumps {id, title, p100_source_url, current_thumb_url}
 *      for every ic_contributor post → JSON via stdin-piped PHP (avoids quote
 *      nesting hell with double-quoted SSH wrapping single-quoted PHP).
 *   2. For each row, resolve P100 page → ec_headshot → media source_url via
 *      authenticated REST.
 *   3. If basenames differ, `wp media import` the P100 url + set as featured.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const axios = require('axios');
const { execSync, spawnSync } = require('child_process');

const STG = process.env.STAGING_P100_BASE || 'https://staging.power100.io';
const STG_AUTH = 'Basic ' + Buffer.from(process.env.STAGING_P100_ADMIN_USER + ':' + process.env.STAGING_P100_ADMIN_APP_PWD).toString('base64');
const IC_SSH  = 'runcloud@45.76.62.153';
const IC_PATH = '/home/runcloud/webapps/innercircle';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Pipe PHP via stdin to `wp eval-file -` (reads multi-line PHP, no quote hell).
function sshPipePhp(phpCode) {
  const r = spawnSync('ssh', ['-o', 'BatchMode=yes', IC_SSH, `cd ${IC_PATH} && wp eval-file -`], {
    input: '<?php\n' + phpCode,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`ssh wp eval-file failed (${r.status}): ${r.stderr}`);
  return r.stdout;
}

function ssh(cmd) {
  return execSync(`ssh -o BatchMode=yes ${IC_SSH} "cd ${IC_PATH} && ${cmd}"`, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
}

async function getP100HeadshotUrl(p100PageUrl) {
  let pageId = null;
  const pidMatch = p100PageUrl.match(/[?&]page_id=(\d+)/);
  if (pidMatch) pageId = parseInt(pidMatch[1], 10);
  else {
    const slugMatch = p100PageUrl.match(/staging\.power100\.io\/([a-z0-9-]+)\/?$/i);
    if (slugMatch) {
      const r = await axios.get(`${STG}/wp-json/wp/v2/pages?slug=${slugMatch[1]}&_fields=id`, { headers: { Authorization: STG_AUTH }, timeout: 10000 });
      if (r.data?.[0]?.id) pageId = r.data[0].id;
    }
  }
  if (!pageId) return null;
  const r = await axios.get(`${STG}/wp-json/wp/v2/pages/${pageId}?context=edit&_fields=meta`, { headers: { Authorization: STG_AUTH }, timeout: 12000 });
  const hid = r.data?.meta?.ec_headshot;
  if (!hid || !Number.isFinite(parseInt(hid, 10))) return null;
  const m = await axios.get(`${STG}/wp-json/wp/v2/media/${hid}?_fields=source_url`, { headers: { Authorization: STG_AUTH }, timeout: 10000 });
  return m.data?.source_url || null;
}

(async () => {
  console.log('[sync] Bulk-dumping all IC contributors metadata via wp shell stdin...');
  const phpDump = `
$out = [];
$posts = get_posts(['post_type'=>'ic_contributor','post_status'=>'any','posts_per_page'=>-1,'fields'=>'ids']);
foreach ($posts as $id) {
    $thumb_id = (int) get_post_meta($id, '_thumbnail_id', true);
    $thumb_url = $thumb_id ? wp_get_attachment_url($thumb_id) : '';
    $out[] = [
        'id' => $id,
        'title' => get_the_title($id),
        'p100_source_url' => (string) get_post_meta($id, '_p100_source_url', true),
        'thumb_url' => $thumb_url ?: '',
    ];
}
echo "JSONSTART".json_encode($out)."JSONEND";
`;
  const stdout = sshPipePhp(phpDump);
  const m = stdout.match(/JSONSTART(.*)JSONEND/s);
  if (!m) { console.error('No JSON in dump output:', stdout.slice(-500)); process.exit(1); }
  const rows = JSON.parse(m[1]);
  console.log(`[sync] Dumped ${rows.length} IC contributors\n`);

  let synced = 0, in_sync = 0, no_p100 = 0, no_url = 0, errors = 0;
  const norm = s => (s || '').replace(/-\d+x\d+(\.\w+)$/, '$1').replace(/-\d+(\.\w+)$/, '$1');

  for (let i = 0; i < rows.length; i++) {
    const { id, title, p100_source_url, thumb_url } = rows[i];
    process.stdout.write(`[${i+1}/${rows.length}] ${(title || '').padEnd(38)} `);

    try {
      if (!p100_source_url) { process.stdout.write('SKIP (no _p100_source_url)\n'); no_p100++; continue; }

      const p100Photo = await getP100HeadshotUrl(p100_source_url);
      if (!p100Photo) { process.stdout.write('SKIP (P100 has no headshot)\n'); no_url++; continue; }

      const p100Base = p100Photo.split('/').pop().split('?')[0];
      const icBase   = thumb_url ? thumb_url.split('/').pop().split('?')[0] : '';
      if (icBase && norm(p100Base) === norm(icBase)) {
        process.stdout.write('already in sync\n'); in_sync++;
        continue;
      }

      // Import via WP-CLI — title needs single-quote escape
      const safeTitle = (title || '').replace(/'/g, "'\\''");
      const newAttId = ssh(`wp media import '${p100Photo}' --title='${safeTitle}' --alt='${safeTitle}' --post_id=${id} --featured_image --porcelain`).split('\n').pop().trim();
      const cleanId = parseInt(newAttId, 10);
      if (!cleanId) throw new Error('media import returned no attachment id: ' + newAttId);
      ssh(`wp post meta update ${id} ec_headshot ${cleanId}`);
      process.stdout.write(`✓ synced new att=${cleanId}\n`);
      synced++;
    } catch (e) {
      process.stdout.write(`ERR ${(e.message || '').toString().slice(0, 100)}\n`);
      errors++;
    }
    await sleep(120);
  }

  console.log('\n========== Summary ==========');
  console.log(`Synced (new photo):          ${synced}`);
  console.log(`Already in sync:             ${in_sync}`);
  console.log(`Skipped (no _p100_source):   ${no_p100}`);
  console.log(`Skipped (P100 no headshot):  ${no_url}`);
  console.log(`Errors:                      ${errors}`);
  process.exit(errors > 0 ? 1 : 0);
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
