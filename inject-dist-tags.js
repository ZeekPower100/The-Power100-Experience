/**
 * Inject Distribution Tags step into the staging presentation page
 */
const fs = require('fs');
const sourceFile = process.argv[2] || '/tmp/staging-presentation-raw.html';
let raw = fs.readFileSync(sourceFile, 'utf8');
console.log('Source:', sourceFile);

// === 1. Rename step5 (payment) to step6 ===
raw = raw.replace('id="step5"', 'id="step6"');
console.log('1. Renamed step5 -> step6');

// === 2. Update progress bar ===
raw = raw.replace(
  '<div class="p100-progress-step" data-step="5"><div class="p100-progress-num">5</div><span class="p100-progress-label">Payment</span></div>',
  '<div class="p100-progress-step" data-step="5"><div class="p100-progress-num">5</div><span class="p100-progress-label">Distribution</span></div><div class="p100-progress-step" data-step="6"><div class="p100-progress-num">6</div><span class="p100-progress-label">Payment</span></div>'
);
console.log('2. Progress bar updated');

// === 3. Update step comment ===
raw = raw.replace('<!-- STEP 5', '<!-- STEP 6');
console.log('3. Comment updated');

// === 4. Insert Distribution Tags step div ===
const step6Pos = raw.indexOf('<!-- STEP 6');
const distHTML = [
  '<div class="p100-step" id="step5">',
  '<div class="p100-form-section">',
  '<div class="p100-section-header">',
  '<span class="section-eyebrow">Step 5 of 6</span>',
  '<h2>Distribution Tags</h2>',
  '<p class="section-desc">Who should we notify when your content goes live? Add team members, partners, or advocates who will help amplify your content on social media. Minimum 10 recommended.</p>',
  '</div>',
  '<div id="distFields">',
  // 3 initial rows
  '<div class="p100-repeater-item dist-row"><div class="p100-row"><div class="p100-field"><label>Name <span class="req">*</span></label><input type="text" class="dist-name" maxlength="60" placeholder="e.g. Sarah Johnson"></div><div class="p100-field"><label>Email <span class="req">*</span></label><input type="email" class="dist-email" maxlength="80" placeholder="e.g. sarah@company.com"></div></div><div class="p100-field"><label>Phone <span class="opt">(optional)</span></label><input type="text" class="dist-phone" maxlength="20" placeholder="e.g. 555-123-4567"></div></div>',
  '<div class="p100-repeater-item dist-row"><div class="p100-row"><div class="p100-field"><label>Name <span class="req">*</span></label><input type="text" class="dist-name" maxlength="60" placeholder="Name"></div><div class="p100-field"><label>Email <span class="req">*</span></label><input type="email" class="dist-email" maxlength="80" placeholder="Email"></div></div><div class="p100-field"><label>Phone <span class="opt">(optional)</span></label><input type="text" class="dist-phone" maxlength="20" placeholder="Phone (optional)"></div></div>',
  '<div class="p100-repeater-item dist-row"><div class="p100-row"><div class="p100-field"><label>Name <span class="req">*</span></label><input type="text" class="dist-name" maxlength="60" placeholder="Name"></div><div class="p100-field"><label>Email <span class="req">*</span></label><input type="email" class="dist-email" maxlength="80" placeholder="Email"></div></div><div class="p100-field"><label>Phone <span class="opt">(optional)</span></label><input type="text" class="dist-phone" maxlength="20" placeholder="Phone (optional)"></div></div>',
  '</div>',
  '<div style="margin-top:12px;"><button type="button" class="p100-btn-back" style="font-size:13px;padding:8px 20px;" id="addDistBtn">+ Add Another Contact</button></div>',
  '<div style="margin-top:8px;font-size:11px;color:rgba(176,176,176,1);">Add up to 20 contacts. Name and email required.</div>',
  '</div>',
  '</div>'
].join('');

raw = raw.substring(0, step6Pos) + distHTML + raw.substring(step6Pos);
console.log('4. Distribution step inserted');

// === 5. Update nav config ===
// Step 4 label: "Continue to Payment" -> "Continue"
raw = raw.replace("Continue to Payment \u2192", "Continue \u2192");

// Add step 5 nav (back->4, continue->6) and rename old step 5 to step 6
raw = raw.replace(
  "5: [{ cls: 'p100-btn-back', label: '\u2190 Back', fn: function() { goStep(4); } }, { cls: 'p100-btn-submit'",
  "5: [{ cls: 'p100-btn-back', label: '\u2190 Back', fn: function() { goStep(4); } }, { cls: 'p100-btn-next', label: 'Continue to Payment \u2192', fn: function() { goStep(6); } }], 6: [{ cls: 'p100-btn-back', label: '\u2190 Back', fn: function() { goStep(5); } }, { cls: 'p100-btn-submit'"
);
console.log('5. Nav config updated');

// === 6. Add JS for add contact button ===
const lastScript = raw.lastIndexOf('</script>');
const distJS = [
  'var distC=3;',
  'document.getElementById("addDistBtn").addEventListener("click",function(){',
  'if(distC>=20)return;',
  'distC++;',
  'var c=document.getElementById("distFields");',
  'var item=document.createElement("div");',
  'item.className="p100-repeater-item dist-row";',
  'var row=document.createElement("div");',
  'row.className="p100-row";',
  'var f1=document.createElement("div");f1.className="p100-field";',
  'var l1=document.createElement("label");l1.textContent="Name";',
  'var i1=document.createElement("input");i1.type="text";i1.className="dist-name";i1.maxLength=60;i1.placeholder="Name";',
  'f1.appendChild(l1);f1.appendChild(i1);row.appendChild(f1);',
  'var f2=document.createElement("div");f2.className="p100-field";',
  'var l2=document.createElement("label");l2.textContent="Email";',
  'var i2=document.createElement("input");i2.type="email";i2.className="dist-email";i2.maxLength=80;i2.placeholder="Email";',
  'f2.appendChild(l2);f2.appendChild(i2);row.appendChild(f2);',
  'item.appendChild(row);',
  'var f3=document.createElement("div");f3.className="p100-field";',
  'var l3=document.createElement("label");l3.textContent="Phone (optional)";',
  'var i3=document.createElement("input");i3.type="text";i3.className="dist-phone";i3.maxLength=20;i3.placeholder="Phone (optional)";',
  'f3.appendChild(l3);f3.appendChild(i3);item.appendChild(f3);',
  'c.appendChild(item);',
  'if(distC>=20){document.getElementById("addDistBtn").style.display="none";}',
  '});'
].join('');

raw = raw.substring(0, lastScript) + distJS + '\n' + raw.substring(lastScript);
console.log('6. JS injected');

// === 7. Add distribution_contacts to payload ===
const webhookIdx = raw.indexOf('ec-intake-form');
const geoIdx = raw.lastIndexOf('geo_keywords:', webhookIdx);
const afterGeo = raw.indexOf(',', geoIdx + 20);
const distPayload = 'distribution_contacts:(function(){var dc=[];document.querySelectorAll(".dist-row").forEach(function(row){var n=row.querySelector(".dist-name");var e=row.querySelector(".dist-email");var p=row.querySelector(".dist-phone");if(n){if(e){if(n.value.trim()){if(e.value.trim()){dc.push({name:n.value.trim(),email:e.value.trim(),phone:p?p.value.trim():""});}}}}});return dc;})(),';
raw = raw.substring(0, afterGeo + 1) + distPayload + raw.substring(afterGeo + 1);
console.log('7. Payload field injected');

// === VERIFY ===
const blankLines = raw.split('\n').filter(l => l.trim() === '').length;
console.log('Blank lines:', blankLines);
const scripts = raw.match(/<script[\s\S]*?<\/script>/g) || [];
scripts.forEach((b, i) => { if (b.includes('&&')) console.error('FAIL: && in script ' + i); });
console.log('Has step5 (distribution):', raw.includes('id="step5"'));
console.log('Has step6 (payment):', raw.includes('id="step6"'));
console.log('Has distFields:', raw.includes('distFields'));
console.log('Has distribution_contacts:', raw.includes('distribution_contacts'));
console.log('Has data-step 6:', raw.includes('data-step="6"'));
console.log('goStep(6) count:', (raw.match(/goStep\(6\)/g) || []).length);
console.log('Length:', raw.length);

const outFile = process.argv[3] || '/tmp/staging-with-dist.html';
fs.writeFileSync(outFile, raw, 'utf8');
console.log('Output:', outFile);
