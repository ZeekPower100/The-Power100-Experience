<?php
/**
 * Extract structured fields from a cached ranked CEO lander HTML file.
 *
 * Reads HTML on stdin, outputs JSON to stdout matching the simplified pcl_* ACF schema.
 * Mirrors the EC template's numbered-video-slots pattern.
 *
 * Usage:
 *   cat ceo-lander.html | php extract-ceo-lander-fields.php
 *
 * Output JSON shape:
 * {
 *   "ok": true,
 *   "fields": {
 *     "pcl_rank_number": 4,
 *     "pcl_rank_label": "National Power Ranking",
 *     "pcl_ceo_full_name": "Andy Lindus",
 *     "pcl_company_name": "Lindus Construction",
 *     "pcl_company_linkedin_url": "https://...",
 *     "pcl_headshot_image": "https://...",
 *     "pcl_salute_text": "Salutes, Andy! ...",
 *     "pcl_video_1_url": "https://...mp4", "pcl_video_1_thumb": "...", "pcl_video_1_title": "Introduction",
 *     "pcl_video_2_*": ..., (up to 9)
 *     "pcl_snapshots": "url1\nurl2\n...",
 *     "pcl_bio_body": "<p>...</p><p>...</p>"
 *   },
 *   "stats": { videos_found, videos_valid, snapshots_found, bio_chars }
 * }
 */

const VIDEO_SLOT_COUNT = 15;
const TESTIMONIAL_SLOT_COUNT = 6;
const STANDARD_TITLES = [
    'Introduction',
    'Feature Interview',
    'Executive Interview',
    'Customer Interview',
    'Highlight Video',
    'Additional Content',
    'Bonus Video',
    'Extra Video',
    'More',
];

function extract_ceo_lander($html) {
    if (empty(trim($html))) return ['ok' => false, 'error' => 'Empty input'];

    $wrapped = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' . $html . '</body></html>';
    libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    $dom->loadHTML($wrapped);
    libxml_clear_errors();
    $xpath = new DOMXPath($dom);

    $fields = [];
    $stats = ['videos_found' => 0, 'videos_valid' => 0, 'snapshots_found' => 0, 'bio_chars' => 0];

    // ── 1. CEO NAME — extract from <title> tag (most reliable) ──
    // Title format: "Andy Lindus Power Ranked CEO - Power 100"
    //              or "Peter Svedin CEO Lander - Power 100"
    //              or "James Freeman Lander - Power 100"
    $page_title = '';
    $titleEl = $xpath->query('//title')->item(0);
    if ($titleEl) $page_title = trim($titleEl->textContent);

    $ceo_name = null;
    if ($page_title) {
        // Strip suffixes
        $clean = preg_replace('/\s*-\s*Power\s*100.*$/i', '', $page_title);
        // Strip role/lander descriptors
        $clean = preg_replace('/\s+(Power\s+)?Ranked\s+CEO.*$/i', '', $clean);
        $clean = preg_replace('/\s+CEO\s+Lander.*$/i', '', $clean);
        $clean = preg_replace('/\s+Lander.*$/i', '', $clean);
        // Strip zero-width chars (U+200B..U+200D, U+FEFF) that can live in old
        // Elementor source — the CEO's hero h1 usually doesn't have them, so if
        // we don't strip here, downstream name-equality checks (e.g., video group
        // filter) fail and the CEO's own name leaks through as a group label.
        $clean = preg_replace('/[\x{200B}-\x{200D}\x{FEFF}]/u', '', $clean);
        $clean = trim($clean);
        if ($clean && preg_match('/^[A-Z]/', $clean) && strlen($clean) < 60) {
            $ceo_name = $clean;
        }
    }
    $fields['pcl_ceo_full_name'] = $ceo_name;

    // ── 2. RANK NUMBER ──
    $rank = null;
    foreach ($xpath->query('//h1 | //h2 | //h3') as $h) {
        $text = trim(preg_replace('/\s+/', ' ', $h->textContent));
        if (preg_match('/^#?(\d{1,3})$/', $text, $m)) {
            $rank = (int)$m[1];
            break;
        }
        if (preg_match('/National Power Ranking\s*#?(\d{1,3})/i', $text, $m)) {
            $rank = (int)$m[1];
            break;
        }
    }
    $fields['pcl_rank_number'] = $rank;
    $fields['pcl_rank_label'] = 'National Power Ranking';

    // ── 3. SALUTE TEXT ──
    $salute_text = null;
    foreach ($xpath->query('//h1 | //h2 | //h3') as $h) {
        $text = trim(preg_replace('/\s+/', ' ', $h->textContent));
        if (stripos($text, 'Salutes,') === 0 || stripos($text, "You're 1 Of The Nation") !== false || stripos($text, "Nation's BEST") !== false) {
            $salute_text = $text;
            break;
        }
    }
    $fields['pcl_salute_text'] = $salute_text;

    // ── 4. COMPANY NAME ──
    // Strategy 1: search the body text for "Company Name: ..." or "Company:"
    $company_name = null;
    $bodyEl = $xpath->query('//body')->item(0);
    if ($bodyEl) {
        $bodyText = $bodyEl->textContent;
        if (preg_match('/Company\s*Name\s*:?\s*([A-Z][^\n\r,()]+?)(?:\s*LinkedIn|\s*Click|\s*$|\s*\.\s)/i', $bodyText, $m)) {
            $company_name = trim($m[1]);
            // Strip trailing junk
            $company_name = preg_replace('/\s+(About|Power100|Snapshots|Highlight).*$/', '', $company_name);
        }
    }
    // Strategy 2: extract from headshot URL (often contains company name like "CEO-of-Lindus-Construction-...")
    if (!$company_name) {
        $headshot_temp = '';
        foreach ($xpath->query('//img') as $img) {
            $src = $img->getAttribute('src');
            if ($src && preg_match('/Power100[-_]Frame|Frame[-_]Power100|-Frame-/i', $src)) {
                $headshot_temp = $src;
                break;
            }
        }
        // Look at OTHER images for "CEO-of-{Company}" pattern
        foreach ($xpath->query('//img') as $img) {
            $src = $img->getAttribute('src');
            if (!$src) continue;
            if (preg_match('/CEO-of-([A-Z][a-zA-Z-]+(?:-[A-Z][a-zA-Z-]+)*?)-(photo|with|family|and|Family|Customer)/i', basename($src), $m)) {
                $candidate = str_replace('-', ' ', $m[1]);
                if (strlen($candidate) > 3 && strlen($candidate) < 80) {
                    $company_name = $candidate;
                    break;
                }
            }
        }
    }
    $fields['pcl_company_name'] = $company_name;

    // ── 5. LINKEDIN URL ──
    $linkedin_url = null;
    foreach ($xpath->query('//a[contains(@href, "linkedin.com")]') as $a) {
        $href = $a->getAttribute('href');
        if ($href && (stripos($href, 'linkedin.com/in/') !== false || stripos($href, 'linkedin.com/company/') !== false)) {
            $linkedin_url = $href;
            break;
        }
    }
    $fields['pcl_company_linkedin_url'] = $linkedin_url;

    // ── 6. HEADSHOT IMAGE ──
    // The Power100-Frame photo is the canonical headshot
    $headshot_url = null;
    foreach ($xpath->query('//img') as $img) {
        $src = $img->getAttribute('src');
        if (!$src) continue;
        if (preg_match('/Power100[-_]Frame|Frame[-_]Power100|-Frame-/i', $src)) {
            $headshot_url = $src;
            break;
        }
    }
    // Fallback: square-ish image that's not a logo
    if (!$headshot_url) {
        foreach ($xpath->query('//img') as $img) {
            $src = $img->getAttribute('src');
            if (!$src) continue;
            if (stripos($src, 'logo') !== false || stripos($src, 'asset-3') !== false) continue;
            $w = (int)$img->getAttribute('width');
            $h = (int)$img->getAttribute('height');
            if ($w > 0 && $h > 0 && abs($w - $h) < 50 && $w > 200) {
                $headshot_url = $src;
                break;
            }
        }
    }
    $fields['pcl_headshot_image'] = $headshot_url;

    // ── 7. VIDEO WIDGETS — walk in document order, capture title + group ──
    // The old Elementor source pattern is consistently:
    //   - Inner column = video widget → divider → heading (the video's own title)
    //   - Section-level heading between inner sections = group label
    //     (e.g., "Executive Interviews", "Customer Interviews")
    //
    // Walk all video AND heading widgets in document order. After a video, the
    // next heading (within the same column) titles it. Headings outside columns
    // become group labels for any subsequent videos.
    $videos = [];
    $current_group = null;
    $pending_video_idx = null;

    // Headings that indicate a section transition (not a title or group).
    // Also treat ANY heading ending in ":" as a label/section marker — that's
    // a reliable pattern in the old Elementor source ("Company Name:", "LinkedIn:",
    // "About Us:", "Rankings Lists:", "Customer Feedback:", etc.).
    $section_skip_re = '/^(About\s*Us|Highlight\s*Reel|Customer\s*Feedback|Schedule|CEO\s*Interview|Rankings\s*List|National\s*Power\s*Ranking|Salutes,|You\'re\s*1\s*Of|Ready\s*to\s*control|Company\s*Name|LinkedIn)|:\s*$/i';

    $vh_query = '//*[contains(concat(" ", normalize-space(@class), " "), " elementor-widget-video ") '
              . 'or contains(concat(" ", normalize-space(@class), " "), " elementor-widget-heading ")]';

    foreach ($xpath->query($vh_query) as $widget) {
        $cls = ' ' . preg_replace('/\s+/', ' ', $widget->getAttribute('class')) . ' ';
        $is_video = strpos($cls, ' elementor-widget-video ') !== false;
        $is_heading = strpos($cls, ' elementor-widget-heading ') !== false;

        if ($is_video) {
            $stats['videos_found']++;
            $settings_raw = $widget->getAttribute('data-settings');
            $settings = $settings_raw ? json_decode($settings_raw, true) : null;

            $url = null;
            $thumb = null;

            if (is_array($settings)) {
                $type = $settings['video_type'] ?? null;
                if ($type === 'youtube' && !empty($settings['youtube_url'])) {
                    $candidate = $settings['youtube_url'];
                    if (filter_var($candidate, FILTER_VALIDATE_URL)
                        && (stripos($candidate, 'youtube.com') !== false || stripos($candidate, 'youtu.be') !== false)) {
                        $url = $candidate;
                    }
                } elseif ($type === 'vimeo' && !empty($settings['vimeo_url'])) {
                    $candidate = $settings['vimeo_url'];
                    if (filter_var($candidate, FILTER_VALIDATE_URL)) $url = $candidate;
                } else {
                    $videoTags = $widget->getElementsByTagName('video');
                    if ($videoTags->length > 0) {
                        $candidate = $videoTags->item(0)->getAttribute('src');
                        if ($candidate && filter_var($candidate, FILTER_VALIDATE_URL)) $url = $candidate;
                    }
                }

                if (!empty($settings['image_overlay']['url'])) {
                    $thumb_candidate = $settings['image_overlay']['url'];
                    if (filter_var($thumb_candidate, FILTER_VALIDATE_URL)) $thumb = $thumb_candidate;
                }
            }

            if ($url || $thumb) {
                $videos[] = [
                    'url'   => $url,
                    'thumb' => $thumb,
                    'title' => null,
                    'group' => $current_group,
                ];
                $pending_video_idx = count($videos) - 1;
                if ($url) $stats['videos_valid']++;
            }
            continue;
        }

        if ($is_heading) {
            $h = $xpath->query('.//h1 | .//h2 | .//h3', $widget)->item(0);
            if (!$h) continue;
            $text = trim(preg_replace('/\s+/', ' ', $h->textContent));
            if ($text === '') continue;

            // Section-transition headings — reset pending and skip
            if (preg_match($section_skip_re, $text)) {
                $pending_video_idx = null;
                continue;
            }
            // Skip rank-only headings ("#4", "4", etc.)
            if (preg_match('/^#?\d{1,3}$/', $text)) continue;
            // Skip the CEO's own name (hero heading) — never a video title or group
            if ($ceo_name && strcasecmp($text, $ceo_name) === 0) continue;
            // Skip headings that are just first-name or last-name fragments of the CEO name
            if ($ceo_name) {
                $name_parts = preg_split('/\s+/', $ceo_name);
                foreach ($name_parts as $part) {
                    if (strlen($part) >= 3 && strcasecmp($text, $part) === 0) continue 2;
                }
            }

            if ($pending_video_idx !== null) {
                // This heading titles the most recent video
                $videos[$pending_video_idx]['title'] = $text;
                $pending_video_idx = null;
            } else {
                // No pending video → potentially a new group label.
                // Group labels are short ("Executive Interviews", "Customer Interviews")
                // — never sentences. Filter by shape:
                $looks_like_group =
                    strlen($text) <= 35
                    && strpos($text, '.') === false
                    && strpos($text, ',') === false
                    && strpos($text, '!') === false
                    && strpos($text, '?') === false
                    && !preg_match('/\b(the|wants|below|with|from|and|for|our|your)\b/i', $text);
                if ($looks_like_group) {
                    $current_group = $text;
                }
            }
        }
    }

    // Assign to numbered slots
    for ($i = 0; $i < VIDEO_SLOT_COUNT; $i++) {
        $slot = $i + 1;
        $vid = $videos[$i] ?? null;
        $fields["pcl_video_{$slot}_url"]   = $vid['url']   ?? null;
        $fields["pcl_video_{$slot}_thumb"] = $vid['thumb'] ?? null;
        // Use real extracted title if present, fall back to STANDARD_TITLES only if missing
        if ($vid && ($vid['url'] || $vid['thumb'])) {
            $fields["pcl_video_{$slot}_title"] = $vid['title'] ?: (STANDARD_TITLES[$i] ?? null);
        } else {
            $fields["pcl_video_{$slot}_title"] = null;
        }
        $fields["pcl_video_{$slot}_group"] = $vid['group'] ?? null;
    }

    // ── 8. SNAPSHOTS (photo gallery — non-headshot, non-thumbnail images) ──
    $snapshot_urls = [];
    $video_thumbs = array_filter(array_map(function($v) { return $v['thumb']; }, $videos));
    foreach ($xpath->query('//img') as $img) {
        $src = $img->getAttribute('src');
        if (!$src) continue;
        if ($src === $headshot_url) continue;
        if (stripos($src, 'logo') !== false || stripos($src, 'asset-3') !== false) continue;
        if (stripos($src, '-Thumbnail') !== false || stripos($src, '_Thumbnail') !== false) continue;
        if (stripos($src, 'Frame') !== false) continue;
        if (in_array($src, $video_thumbs)) continue;
        // Skip small images (< 400px wide) unless width attr is missing
        $w = (int)$img->getAttribute('width');
        if ($w > 0 && $w < 400) continue;
        if (!in_array($src, $snapshot_urls)) {
            $snapshot_urls[] = $src;
        }
    }
    $fields['pcl_snapshots'] = !empty($snapshot_urls) ? implode("\n", $snapshot_urls) : null;
    $stats['snapshots_found'] = count($snapshot_urls);

    // ── 9a. CEO QUOTE — pull from the first substantial blockquote widget ──
    $ceo_quote = null;
    $ceo_quote_cite = null;
    foreach ($xpath->query('//*[contains(@class, "elementor-widget-blockquote")]') as $bq_widget) {
        $contentEl = $xpath->query('.//*[contains(@class, "elementor-blockquote__content")]', $bq_widget)->item(0);
        if (!$contentEl) {
            // Fallback: any <blockquote><p>
            $pEl = $xpath->query('.//blockquote//p', $bq_widget)->item(0);
            if ($pEl) $contentEl = $pEl;
        }
        if (!$contentEl) continue;
        $text = trim(preg_replace('/\s+/', ' ', $contentEl->textContent));
        // Strip surrounding curly/straight quotes that the source sometimes wraps the text in
        $text = trim($text, " \t\n\r\0\x0B\"“”'‘’");
        if (strlen($text) < 20) continue;
        $ceo_quote = $text;
        $citeEl = $xpath->query('.//*[contains(@class, "elementor-blockquote__author")]', $bq_widget)->item(0);
        if (!$citeEl) $citeEl = $xpath->query('.//cite', $bq_widget)->item(0);
        if ($citeEl) {
            $ceo_quote_cite = trim(preg_replace('/\s+/', ' ', $citeEl->textContent));
        }
        break;
    }
    $fields['pcl_ceo_quote'] = $ceo_quote;
    $fields['pcl_ceo_quote_cite'] = $ceo_quote_cite;

    // ── 9b. CUSTOMER TESTIMONIALS — walk elementor-testimonial blocks (carousel slides) ──
    $testimonials = [];
    // Match elements whose class list contains "elementor-testimonial" as a standalone
    // token (not "elementor-testimonial__text" etc.) — that's the per-slide wrapper.
    $t_xpath = '//*[contains(concat(" ", normalize-space(@class), " "), " elementor-testimonial ")]';
    foreach ($xpath->query($t_xpath) as $t_wrap) {
        $textEl  = $xpath->query('.//*[contains(@class, "elementor-testimonial__text")]', $t_wrap)->item(0);
        $nameEl  = $xpath->query('.//*[contains(@class, "elementor-testimonial__name")]', $t_wrap)->item(0);
        $titleEl = $xpath->query('.//*[contains(@class, "elementor-testimonial__title")]', $t_wrap)->item(0);

        $quote = $textEl ? trim(preg_replace('/\s+/', ' ', $textEl->textContent)) : '';
        $name  = $nameEl ? trim(preg_replace('/\s+/', ' ', $nameEl->textContent)) : '';
        $title = $titleEl ? trim(preg_replace('/\s+/', ' ', $titleEl->textContent)) : '';

        // Strip surrounding curly/straight quote marks that Elementor sometimes wraps with
        $quote = trim($quote, " \t\n\r\0\x0B\"“”'‘’");

        // Skip placeholder testimonials — old site left these as "contact us to
        // leave your quote here" CTA blocks attributed to the CEO himself.
        // Filters:
        //   - Name matches the CEO's own name (CEO wouldn't be a testimonial on their own page)
        //   - Quote is wrapped in or contains a bracketed placeholder [...]
        //   - Quote contains "CONTACT US" (literal CTA language)
        if ($ceo_name && strcasecmp($name, $ceo_name) === 0) continue;
        if (preg_match('/\[[^\]]{5,}\]/', $quote)) continue;
        if (stripos($quote, 'CONTACT US') !== false) continue;

        if (strlen($quote) >= 15) {
            $testimonials[] = [
                'quote' => $quote,
                'name'  => $name,
                'title' => $title,
            ];
        }
    }

    // Assign to numbered slots
    for ($i = 0; $i < TESTIMONIAL_SLOT_COUNT; $i++) {
        $slot = $i + 1;
        $t = $testimonials[$i] ?? null;
        $fields["pcl_testimonial_{$slot}_quote"] = $t['quote'] ?? null;
        $fields["pcl_testimonial_{$slot}_name"]  = $t['name']  ?? null;
        $fields["pcl_testimonial_{$slot}_title"] = $t['title'] ?? null;
    }
    $stats['testimonials_found'] = count($testimonials);

    // ── 9. SECTIONED CONTENT — bio, company_about, rankings_lists, company_address ──
    // Walk widgets in document order, tracking the most recent section heading.
    // Route text-editor content to the right field based on the heading label.
    $bio_parts = [];
    $company_about_parts = [];
    $rankings_lists_parts = [];
    $company_name_extra = null;
    $company_address = null;

    $current_label = null; // 'bio' | 'company' | 'rankings' | null
    $widgets = $xpath->query(
        '//*[contains(concat(" ", normalize-space(@class), " "), " elementor-widget-heading ") '
        . 'or contains(concat(" ", normalize-space(@class), " "), " elementor-widget-text-editor ")]'
    );

    foreach ($widgets as $widget) {
        $cls = ' ' . preg_replace('/\s+/', ' ', $widget->getAttribute('class')) . ' ';
        $is_heading = strpos($cls, ' elementor-widget-heading ') !== false;
        $is_text = strpos($cls, ' elementor-widget-text-editor ') !== false;

        if ($is_heading) {
            $h = $xpath->query('.//h1 | .//h2 | .//h3', $widget)->item(0);
            if (!$h) continue;
            $text = trim(preg_replace('/\s+/', ' ', $h->textContent));
            if ($text === '') continue;

            // Section transitions
            if (stripos($text, 'About Us') !== false) {
                $current_label = 'company';
                continue;
            }
            if (stripos($text, 'Rankings List') !== false) {
                $current_label = 'rankings';
                continue;
            }
            if (stripos($text, 'Highlight Reel') !== false) {
                $current_label = 'bio';
                continue;
            }
            if (stripos($text, 'Customer Feedback') !== false
                || stripos($text, 'Schedule') !== false
                || stripos($text, 'CEO Interview') !== false) {
                $current_label = null;
                continue;
            }

            // Headings inside the company section that come AFTER the about-us
            // text editor are the company name + address.
            if ($current_label === 'company' && !empty($company_about_parts)) {
                $looks_like_address =
                    preg_match('/\d{5}/', $text)               // ZIP
                    || preg_match('/\b[A-Z]{2}\b/', $text)     // state code
                    || preg_match('/\d+\s+[A-Z]/', $text);     // street number
                if ($looks_like_address) {
                    $company_address = $text;
                } elseif (!$company_name_extra) {
                    $company_name_extra = $text;
                }
            }
            continue;
        }

        if ($is_text) {
            $inner_html = '';
            foreach ($widget->getElementsByTagName('p') as $p) {
                $inner_html .= $dom->saveHTML($p);
            }
            // Fallback: some Elementor text-editors store raw text directly in
            // widget-container with no <p> wrappers (e.g., James Freeman's About Us).
            // Grab the container's own text and wrap each non-empty line in <p>.
            if (!$inner_html) {
                $container = $xpath->query('.//*[contains(@class, "elementor-widget-container")]', $widget)->item(0);
                if ($container) {
                    // Strip any child elements to get pure text; fall back to textContent
                    $raw = trim($container->textContent);
                    if ($raw !== '') {
                        $lines = preg_split('/\R{2,}/', $raw);  // split on blank lines
                        foreach ($lines as $line) {
                            $line = trim($line);
                            if ($line !== '') {
                                $inner_html .= '<p>' . htmlspecialchars($line, ENT_QUOTES, 'UTF-8') . '</p>';
                            }
                        }
                    }
                }
            }
            if (!$inner_html) continue;
            $text_only = strip_tags($inner_html);
            $len = strlen(trim($text_only));

            if ($current_label === 'company') {
                // Take any non-trivial content as company about
                if ($len > 30) $company_about_parts[] = $inner_html;
            } elseif ($current_label === 'rankings') {
                // Rankings list links — keep all content (short is fine)
                if ($len > 0) $rankings_lists_parts[] = $inner_html;
            } else {
                // Default bucket: bio (highlight reel). Include unlabeled/bio buckets,
                // skip very short snippets (captions / nav).
                if ($len > 100) $bio_parts[] = $inner_html;
            }
        }
    }

    $bio_body = implode("\n", $bio_parts);
    $company_about = implode("\n", $company_about_parts);
    $rankings_lists = implode("\n", $rankings_lists_parts);

    $fields['pcl_bio_body']         = $bio_body ?: null;
    $fields['pcl_company_about']    = $company_about ?: null;
    $fields['pcl_company_address']  = $company_address ?: null;
    $fields['pcl_rankings_lists']   = $rankings_lists ?: null;

    // Backfill company name if main extractor missed it but we found one in the
    // About Us section headings.
    if (empty($fields['pcl_company_name']) && $company_name_extra) {
        $fields['pcl_company_name'] = $company_name_extra;
    }

    $stats['bio_chars']           = strlen(strip_tags($bio_body));
    $stats['company_about_chars'] = strlen(strip_tags($company_about));
    $stats['rankings_lists_chars'] = strlen(strip_tags($rankings_lists));
    $stats['has_address']         = $company_address ? 1 : 0;

    return ['ok' => true, 'fields' => $fields, 'stats' => $stats];
}

// ── CLI ──
$html = stream_get_contents(STDIN);
$result = extract_ceo_lander($html);
echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
echo "\n";
