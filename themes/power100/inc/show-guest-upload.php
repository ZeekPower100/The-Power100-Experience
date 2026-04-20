<?php
/**
 * Show Guest headshot upload REST endpoint.
 *
 * POST /wp-json/show-guest/v1/upload-headshot?token=XXX
 * Body: multipart/form-data with "file" field.
 * Verifies the token against the TPX backend before accepting the upload,
 * sideloads the file into the WP Media Library, returns { success, url, attachment_id }.
 */

if (!defined('ABSPATH')) { exit; }

add_action('rest_api_init', function() {
    register_rest_route('show-guest/v1', '/upload-headshot', array(
        'methods'             => 'POST',
        'callback'            => 'p100_show_guest_upload_headshot',
        'permission_callback' => '__return_true',
    ));
});

function p100_show_guest_upload_headshot(WP_REST_Request $req) {
    $token = $req->get_param('token');
    if (empty($token) || !preg_match('/^[a-f0-9]{20,}$/i', $token)) {
        return new WP_REST_Response(array('success' => false, 'error' => 'Missing or invalid token'), 400);
    }

    // Verify token against TPX backend (server-side, avoids needing the WP
    // upload to trust the caller blindly).
    $api_base = 'https://tpx.power100.io/api/show-guests';
    $verify = wp_remote_get($api_base . '/token/' . rawurlencode($token), array(
        'timeout' => 10,
    ));
    if (is_wp_error($verify)) {
        return new WP_REST_Response(array('success' => false, 'error' => 'Token verification failed (' . $verify->get_error_message() . ')'), 502);
    }
    $verify_code = wp_remote_retrieve_response_code($verify);
    $verify_body = json_decode(wp_remote_retrieve_body($verify), true);
    if ($verify_code !== 200) {
        return new WP_REST_Response(array('success' => false, 'error' => 'Invalid or expired token'), 403);
    }
    if (empty($verify_body['success'])) {
        return new WP_REST_Response(array('success' => false, 'error' => 'Invalid or expired token'), 403);
    }

    $files = $req->get_file_params();
    if (empty($files['file'])) {
        return new WP_REST_Response(array('success' => false, 'error' => 'No file uploaded'), 400);
    }
    $file = $files['file'];

    // Basic validation
    $allowed_mimes = array('image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp');
    $detected = wp_check_filetype($file['name']);
    $mime = isset($file['type']) ? $file['type'] : '';
    if (empty($mime) || !isset($allowed_mimes[$mime])) {
        return new WP_REST_Response(array('success' => false, 'error' => 'Only JPG, PNG, or WebP images are allowed'), 400);
    }
    if (!empty($file['size']) && $file['size'] > 10 * 1024 * 1024) {
        return new WP_REST_Response(array('success' => false, 'error' => 'File exceeds 10 MB limit'), 400);
    }

    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/media.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');

    // Rebuild the $_FILES superglobal for media_handle_sideload
    $_FILES['file'] = $file;

    $overrides = array(
        'test_form' => false,
        'mimes'     => $allowed_mimes,
    );

    $attachment_id = media_handle_sideload($file, 0, 'Show guest headshot', array(), $overrides);
    if (is_wp_error($attachment_id)) {
        return new WP_REST_Response(array('success' => false, 'error' => $attachment_id->get_error_message()), 500);
    }
    $url = wp_get_attachment_url($attachment_id);
    if (!$url) {
        return new WP_REST_Response(array('success' => false, 'error' => 'Uploaded but could not resolve URL'), 500);
    }

    return new WP_REST_Response(array(
        'success'       => true,
        'url'           => $url,
        'attachment_id' => $attachment_id,
    ), 200);
}
