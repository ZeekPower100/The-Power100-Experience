<?php
/**
 * Extract structured article fields from old-site Elementor HTML.
 *
 * Reads HTML on stdin, outputs JSON to stdout.
 *
 * Usage:
 *   echo "$HTML" | php extract-article-fields.php
 *   cat article.html | php extract-article-fields.php
 *
 * Output JSON shape:
 * {
 *   "subtitle":         "<string|null>",        // from <h3> after "Press Release" label
 *   "youtube_url":      "<string|null>",        // parsed from elementor-widget-video data-settings
 *   "video_thumbnail":  "<string|null>",        // parsed from same data-settings image_overlay
 *   "company_label":    "<string|null>",        // detected from header/copy patterns (best effort)
 *   "images":           [{ "url": "...", "caption": "..." }, ...],   // up to first 3 figures
 *   "faq":              [{ "question": "...", "answer": "..." }, ...],
 *   "cleaned_body":     "<string>",             // body HTML with structured fields removed + cleaned
 *   "stats": {
 *     "h2_count": N, "img_count": N, "faq_count": N, "image_count": N,
 *     "found_video": bool, "found_subtitle": bool, "found_faq_section": bool
 *   }
 * }
 *
 * The cleaned_body is post_content-ready: nav/header/footer/elementor wrappers stripped,
 * the FAQ section removed (lives in pr_faq instead), the video widget removed (lives in
 * pr_youtube_url), and the inline figures kept in place inside the body for Phase C to
 * decide whether to extract to pr_images gallery or leave inline.
 */

function extract_fields($html) {
    if (empty(trim($html))) {
        return error('Empty HTML input');
    }

    $wrapped = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' . $html . '</body></html>';
    libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    $dom->loadHTML($wrapped);
    libxml_clear_errors();
    $xpath = new DOMXPath($dom);

    $result = [
        'subtitle' => null,
        'youtube_url' => null,
        'video_thumbnail' => null,
        'company_label' => null,
        'images' => [],
        'faq' => [],
        'cleaned_body' => '',
        'stats' => [
            'h2_count' => 0,
            'img_count' => 0,
            'faq_count' => 0,
            'image_count' => 0,
            'found_video' => false,
            'found_subtitle' => false,
            'found_faq_section' => false,
        ],
    ];

    // ── 1. SUBTITLE: first <h3> in the doc (Elementor articles have one H3 used as subtitle) ──
    $h3s = $xpath->query('//h3');
    if ($h3s->length > 0) {
        $subtitle = trim($h3s->item(0)->textContent);
        if ($subtitle !== '') {
            $result['subtitle'] = $subtitle;
            $result['stats']['found_subtitle'] = true;
        }
    }

    // ── 2. YOUTUBE VIDEO + THUMBNAIL: parse data-settings of elementor-widget-video ──
    $videoWidgets = $xpath->query('//*[contains(@class, "elementor-widget-video")]');
    foreach ($videoWidgets as $vw) {
        $settings = $vw->getAttribute('data-settings');
        if (!$settings) continue;
        // data-settings is JSON-encoded but the &quot; entities have already been decoded
        // by DOMDocument when parsing the attribute. So $settings is already raw JSON.
        $decoded = json_decode($settings, true);
        if (!is_array($decoded)) continue;
        if (!empty($decoded['youtube_url'])) {
            $result['youtube_url'] = $decoded['youtube_url'];
            $result['stats']['found_video'] = true;
        }
        if (!empty($decoded['image_overlay']['url'])) {
            $result['video_thumbnail'] = $decoded['image_overlay']['url'];
        }
        if ($result['youtube_url']) break;  // only need the first
    }

    // ── 3. INLINE FIGURES: <figure class="wp-caption"> with <img> and <figcaption> ──
    $figures = $xpath->query('//figure[contains(@class, "wp-caption")]');
    foreach ($figures as $fig) {
        $imgs = $fig->getElementsByTagName('img');
        if ($imgs->length === 0) continue;
        $img = $imgs->item(0);
        $url = $img->getAttribute('src');
        if (!$url) continue;
        $caption = '';
        $caps = $fig->getElementsByTagName('figcaption');
        if ($caps->length > 0) {
            $caption = trim($caps->item(0)->textContent);
        }
        $result['images'][] = ['url' => $url, 'caption' => $caption];
        if (count($result['images']) >= 3) break;  // template supports max 3 inline figures
    }
    $result['stats']['image_count'] = count($result['images']);
    $result['stats']['img_count'] = $xpath->query('//img')->length;

    // ── 4. FAQ: detect "Frequently Asked Questions" H2, then numbered Q&A H2s ──
    $faqMarker = null;
    $allH2s = $xpath->query('//h2');
    $result['stats']['h2_count'] = $allH2s->length;
    foreach ($allH2s as $h2) {
        if (preg_match('/Frequently\s+Asked\s+Questions/i', $h2->textContent)) {
            $faqMarker = $h2;
            $result['stats']['found_faq_section'] = true;
            break;
        }
    }

    if ($faqMarker) {
        // Walk siblings after the FAQ marker. Each numbered H2 ("1. Question") is a question;
        // the <p> elements between that H2 and the next H2 are the answer.
        $current = $faqMarker;
        $currentQuestion = null;
        $currentAnswerParts = [];

        // We need to walk forward through ALL DOM nodes after $faqMarker, not just siblings,
        // because Elementor wraps things in widget divs. Use XPath to find following H2s.
        $followingH2s = $xpath->query('following::h2', $faqMarker);
        foreach ($followingH2s as $h2) {
            $text = trim(preg_replace('/\s+/', ' ', $h2->textContent));
            // Stop at "About Power100" or any non-numbered H2 that ends the FAQ section
            if (!preg_match('/^\d+\.\s*(.+\??)$/', $text, $m)) {
                if (preg_match('/^About\s+Power100/i', $text)) {
                    // Save the last pending question if any
                    if ($currentQuestion !== null) {
                        $result['faq'][] = [
                            'question' => $currentQuestion,
                            'answer' => trim(implode("\n", $currentAnswerParts)),
                        ];
                        $currentQuestion = null;
                        $currentAnswerParts = [];
                    }
                    break;  // FAQ section ended
                }
                continue;  // Some other H2 we don't recognize as a question
            }
            // Save previous Q&A if any
            if ($currentQuestion !== null) {
                $result['faq'][] = [
                    'question' => $currentQuestion,
                    'answer' => trim(implode("\n", $currentAnswerParts)),
                ];
            }
            $currentQuestion = $m[1];
            $currentAnswerParts = [];

            // Walk paragraphs after this H2 until the next H2
            $followingPs = $xpath->query('following::p', $h2);
            foreach ($followingPs as $p) {
                // Make sure this <p> still belongs to this question (i.e. comes before the next H2)
                $nextH2 = $xpath->query('following::h2', $p);
                if ($nextH2->length > 0) {
                    // If the very next H2 is NOT this question's H2, then we've already moved past
                    // We need a different stop condition. Use document position comparison.
                    $nextH2Node = $nextH2->item(0);
                    if ($nextH2Node !== $h2 && nodeFollowsNode($nextH2Node, $p)) {
                        // p comes after next h2 — out of scope
                        continue;
                    }
                }
                // Check that $p comes AFTER $h2 in document order
                if (!nodeFollowsNode($p, $h2)) continue;
                // And BEFORE the next FAQ h2 (if any)
                $pText = trim($p->textContent);
                if ($pText === '') continue;
                $currentAnswerParts[] = $pText;
                if (count($currentAnswerParts) >= 6) break;  // safety cap per answer
            }
        }
        // Save the final question
        if ($currentQuestion !== null && count($result['faq']) < count(iterator_to_array($followingH2s))) {
            $result['faq'][] = [
                'question' => $currentQuestion,
                'answer' => trim(implode("\n", $currentAnswerParts)),
            ];
        }
    }
    $result['stats']['faq_count'] = count($result['faq']);

    // ── 5. CLEANED BODY ──
    // Strategy: clone the doc, remove all the things we extracted, then run through the
    // standard cleaner (the same one we use for in-place cleanup of existing posts).
    // The cleaner already strips: header/nav/footer, elementor wrappers, svg, h1, post-nav, i, social labels, empty els.
    // We additionally strip: the H3 subtitle (we extracted it), the video widget, the FAQ section,
    // the inline figures (Phase C will use pr_images instead), the "Press Release" h1.
    $bodyClone = $dom->getElementsByTagName('body')->item(0);
    $cloneXpath = new DOMXPath($dom);

    // Strip the subtitle H3 (we have it in $result['subtitle'])
    foreach (iterator_to_array($cloneXpath->query('//h3')) as $h3) {
        if ($h3->parentNode) $h3->parentNode->removeChild($h3);
    }
    // Strip the elementor video widget (we have the URL+thumb in $result)
    foreach (iterator_to_array($cloneXpath->query('//*[contains(@class, "elementor-widget-video")]')) as $vw) {
        if ($vw->parentNode) $vw->parentNode->removeChild($vw);
    }
    // KEEP inline figures in the body — they render in place like the old site.
    // (Previously we stripped them assuming the template would re-render via the
    // pr_images ACF gallery. But that requires WP attachment IDs which we don't
    // have yet (Phase B+ deferred), so the gallery is empty and the result was
    // articles with NO inline images. Keeping figures in body restores parity
    // with the old site rendering.)
    // Strip the FAQ section: remove the FAQ marker H2 and everything from there until "About Power100"
    $faqMarkerInClone = null;
    foreach ($cloneXpath->query('//h2') as $h2) {
        if (preg_match('/Frequently\s+Asked\s+Questions/i', $h2->textContent)) {
            $faqMarkerInClone = $h2;
            break;
        }
    }
    if ($faqMarkerInClone) {
        // Walk forward and collect nodes to delete until we hit "About Power100" or end
        $toDelete = [$faqMarkerInClone];
        $cursor = $faqMarkerInClone->nextSibling;
        while ($cursor) {
            // Check if any descendant is the "About Power100" h2
            $aboutH2 = null;
            if ($cursor->nodeType === XML_ELEMENT_NODE) {
                $abouts = $cloneXpath->query('.//h2', $cursor);
                foreach ($abouts as $a) {
                    if (preg_match('/^About\s+Power100/i', trim($a->textContent))) {
                        $aboutH2 = $a;
                        break;
                    }
                }
            }
            if ($aboutH2) break;  // Stop — "About Power100" is the footer, leave it (will be stripped by cleaner anyway)
            $toDelete[] = $cursor;
            $cursor = $cursor->nextSibling;
        }
        foreach ($toDelete as $node) {
            if ($node->parentNode) $node->parentNode->removeChild($node);
        }
        // Also try going up the tree — FAQ might be nested inside an Elementor widget div.
        // Strip the parent text-editor widget that contains the FAQ marker.
        $parent = $faqMarkerInClone->parentNode;
        while ($parent && $parent->nodeType === XML_ELEMENT_NODE) {
            if ($parent->getAttribute && strpos($parent->getAttribute('class') ?? '', 'elementor-widget') !== false) {
                if ($parent->parentNode) $parent->parentNode->removeChild($parent);
                break;
            }
            $parent = $parent->parentNode;
        }
    }
    // Strip the "Press Release" h1 (template has its own label)
    foreach (iterator_to_array($cloneXpath->query('//h1')) as $h1) {
        if ($h1->parentNode) $h1->parentNode->removeChild($h1);
    }

    // Now apply the same general cleaner pass: nav/header/footer, elementor wrappers, svgs, etc.
    apply_general_cleaner($cloneXpath);

    // Serialize the body's children
    $cleaned = '';
    foreach ($bodyClone->childNodes as $child) {
        $cleaned .= $dom->saveHTML($child);
    }
    $cleaned = preg_replace('/\n{3,}/', "\n\n", $cleaned);
    $result['cleaned_body'] = trim($cleaned);

    return $result;
}

/**
 * Apply the same destructive cleanup rules as p100-content-cleaner.php.
 * Operates in-place on the DOM via the provided XPath.
 */
function apply_general_cleaner($xpath) {
    // header/nav/footer
    foreach (iterator_to_array($xpath->query('//body//header | //body//nav | //body//footer')) as $el) {
        if ($el->parentNode) $el->parentNode->removeChild($el);
    }
    // ul with menu-item children (nav menus) — strip BEFORE unwrap
    foreach (iterator_to_array($xpath->query('//ul[.//li[contains(@class, "menu-item")]]')) as $el) {
        if ($el->parentNode) $el->parentNode->removeChild($el);
    }
    // svgs (decorative dividers)
    foreach (iterator_to_array($xpath->query('//svg')) as $el) {
        if ($el->parentNode) $el->parentNode->removeChild($el);
    }
    // post-navigation
    foreach (iterator_to_array($xpath->query('//*[contains(@class, "post-navigation")]')) as $el) {
        if ($el->parentNode) $el->parentNode->removeChild($el);
    }
    // <i> icons (Font Awesome / Elementor)
    foreach (iterator_to_array($xpath->query('//i')) as $el) {
        if ($el->parentNode) $el->parentNode->removeChild($el);
    }
    // social label spans/anchors — STRIP BEFORE unwrap so the elements still exist
    $socialLabels = ['LinkedIn', 'Facebook', 'Twitter', 'X', 'Reddit', 'WhatsApp', 'Email', 'Pinterest', 'Print', 'Share'];
    foreach (iterator_to_array($xpath->query('//span | //a | //button')) as $el) {
        $text = trim($el->textContent);
        if (in_array($text, $socialLabels, true)) {
            if ($el->parentNode) $el->parentNode->removeChild($el);
        }
    }
    // Strip date metadata paragraphs like "April 08, 2026 | 4 min Read"
    // Template handles date separately — this is leaked Elementor metadata.
    foreach (iterator_to_array($xpath->query('//p')) as $el) {
        $text = trim($el->textContent);
        if (preg_match('/^[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}\s*\|\s*\d+\s+min\s+[Rr]ead/', $text)) {
            if ($el->parentNode) $el->parentNode->removeChild($el);
        }
    }
    // Strip Elementor share-button widgets (various class names)
    foreach (iterator_to_array($xpath->query('//*[contains(@class, "elementor-share-buttons") or contains(@class, "share-button") or contains(@class, "social-icons")]')) as $el) {
        if ($el->parentNode) $el->parentNode->removeChild($el);
    }
    // elements with data-element_type — UNWRAP (preserve children) so body content survives
    foreach (iterator_to_array($xpath->query('//*[@data-element_type]')) as $el) {
        unwrap_element($el);
    }
    // elements with class containing "elementor" — UNWRAP (preserve children)
    foreach (iterator_to_array($xpath->query('//*[contains(@class, "elementor")]')) as $el) {
        unwrap_element($el);
    }
    // empty <a>
    foreach (iterator_to_array($xpath->query('//a[not(normalize-space()) and not(.//img)]')) as $el) {
        if ($el->parentNode) $el->parentNode->removeChild($el);
    }
    // strip style + data-* attributes
    foreach ($xpath->query('//*') as $el) {
        $remove = [];
        if ($el->hasAttributes()) {
            foreach ($el->attributes as $attr) {
                if ($attr->name === 'style' || strpos($attr->name, 'data-') === 0) {
                    $remove[] = $attr->name;
                }
            }
        }
        foreach ($remove as $name) {
            $el->removeAttribute($name);
        }
    }
    // multi-pass empty element removal
    for ($pass = 0; $pass < 4; $pass++) {
        foreach (iterator_to_array($xpath->query('//p[not(normalize-space()) and not(.//img)] | //div[not(normalize-space()) and not(.//img)] | //span[not(normalize-space()) and not(.//img)]')) as $el) {
            if ($el->parentNode) $el->parentNode->removeChild($el);
        }
    }
}

/**
 * Returns true if $a comes AFTER $b in document order.
 */
/**
 * Unwrap an element: move all of its children to its parent (in place), then remove the element.
 * Used to flatten elementor wrapper divs while preserving the body content inside them.
 */
function unwrap_element($el) {
    if (!$el->parentNode) return;
    while ($el->firstChild) {
        $el->parentNode->insertBefore($el->firstChild, $el);
    }
    $el->parentNode->removeChild($el);
}

function nodeFollowsNode($a, $b) {
    // Use DOMNode::compareDocumentPosition if available, else walk
    if (method_exists($a, 'compareDocumentPosition')) {
        $pos = $a->compareDocumentPosition($b);
        return ($pos & 2) !== 0;  // Node.DOCUMENT_POSITION_PRECEDING
    }
    // Fallback: walk forward from $b looking for $a
    $cursor = $b;
    while ($cursor) {
        if ($cursor === $a) return true;
        $cursor = nextNodeInOrder($cursor);
    }
    return false;
}

function nextNodeInOrder($node) {
    if ($node->firstChild) return $node->firstChild;
    while ($node) {
        if ($node->nextSibling) return $node->nextSibling;
        $node = $node->parentNode;
    }
    return null;
}

function error($msg) {
    return ['error' => $msg];
}

// ── CLI ──
$html = stream_get_contents(STDIN);
$result = extract_fields($html);
echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
echo "\n";
