<?php
/**
 * AURA Support & Contact API Endpoint
 * 
 * Handles contact form submissions from the React client-side application.
 * Performs server-side validations, verifies the Google reCAPTCHA response,
 * and sends an email notification to the system administrator.
 */

// ----------------------------------------------------
// 1. Configuration
// ----------------------------------------------------
// TODO: Replace with your destination email address
$to_email = 'lab@redplanetapps.com'; 

// TODO: Replace with your Google reCAPTCHA secret key (Private Key)
$recaptcha_secret = '6Le7rfQsAAAAAEHdS47N-BYtPOkp7O9dPrw8AdiY'; 

// Email Subject Prefix
$subject_prefix = '[AURA Support] ';

// ----------------------------------------------------
// 2. CORS & Header Settings (Allows React Dev Server requests)
// ----------------------------------------------------
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Ensure it is a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "status" => "error",
        "message" => "Method Not Allowed. Only POST submissions are supported."
    ]);
    exit();
}

// ----------------------------------------------------
// 3. Retrieve and Sanitize Form Inputs
// ----------------------------------------------------
// Read JSON input from the POST body
$input_json = file_get_contents('php://input');
$input_data = json_decode($input_json, true);

if (!$input_data) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Bad Request. Invalid JSON payload."
    ]);
    exit();
}

// Extract parameters
$name = isset($input_data['name']) ? strip_tags(trim($input_data['name'])) : '';
$email = isset($input_data['email']) ? filter_var(trim($input_data['email']), FILTER_SANITIZE_EMAIL) : '';
$category = isset($input_data['category']) ? strip_tags(trim($input_data['category'])) : 'general';
$subject = isset($input_data['subject']) ? strip_tags(trim($input_data['subject'])) : '';
$message = isset($input_data['message']) ? strip_tags(trim($input_data['message'])) : '';
$recaptcha_token = isset($input_data['gRecaptchaResponse']) ? $input_data['gRecaptchaResponse'] : '';

// Validate required fields
if (empty($name) || empty($email) || empty($message)) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Please fill in all required fields (Name, Email, Message)."
    ]);
    exit();
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Invalid email address format."
    ]);
    exit();
}

// Check reCAPTCHA token presence
if (empty($recaptcha_token)) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "reCAPTCHA verification is required."
    ]);
    exit();
}

// ----------------------------------------------------
// 4. Verify Google reCAPTCHA Token
// ----------------------------------------------------
$verify_url = 'https://www.google.com/recaptcha/api/siteverify';
$verify_data = [
    'secret'   => $recaptcha_secret,
    'response' => $recaptcha_token,
    'remoteip' => $_SERVER['REMOTE_ADDR']
];

$recaptcha_success = false;

// Attempt verification via cURL (Preferred)
if (function_exists('curl_version')) {
    $ch = curl_init($verify_url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($verify_data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $response = curl_exec($ch);
    if ($response !== false) {
        $response_keys = json_decode($response, true);
        $success = (bool)($response_keys["success"] ?? false);
        $score = isset($response_keys["score"]) ? (float)$response_keys["score"] : 0.0;
        $action = isset($response_keys["action"]) ? $response_keys["action"] : '';
        if ($success && $score >= 0.5 && $action === 'submit') {
            $recaptcha_success = true;
        }
    }
    curl_close($ch);
} else {
    // Fallback: file_get_contents with stream context if cURL is disabled
    $options = [
        'http' => [
            'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
            'method'  => 'POST',
            'content' => http_build_query($verify_data)
        ]
    ];
    $context  = stream_context_create($options);
    $response = @file_get_contents($verify_url, false, $context);
    if ($response !== false) {
        $response_keys = json_decode($response, true);
        $success = (bool)($response_keys["success"] ?? false);
        $score = isset($response_keys["score"]) ? (float)$response_keys["score"] : 0.0;
        $action = isset($response_keys["action"]) ? $response_keys["action"] : '';
        if ($success && $score >= 0.5 && $action === 'submit') {
            $recaptcha_success = true;
        }
    }
}

// Handle Verification Failure
// NOTE: For debugging / initial setup before inputting real keys, 
// you can toggle the recaptcha secret to 'YOUR_RECAPTCHA_SECRET_KEY' to bypass local checks
if (!$recaptcha_success && $recaptcha_secret !== 'YOUR_RECAPTCHA_SECRET_KEY') {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Google reCAPTCHA verification failed. Please try again."
    ]);
    exit();
}

// ----------------------------------------------------
// 5. Send Email
// ----------------------------------------------------
$email_subject = $subject_prefix . (empty($subject) ? ucfirst($category) . " Inquiry" : $subject);

// Format HTML email body
$email_body = "
<html>
<head>
    <title>AURA Support Request</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }
        .container { padding: 20px; border: 1px solid #dddddd; border-radius: 8px; max-width: 600px; }
        .header { background: #8b5cf6; color: #ffffff; padding: 12px 20px; border-radius: 6px 6px 0 0; font-size: 18px; font-weight: bold; }
        .meta-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .meta-table td { padding: 8px; border-bottom: 1px solid #eeeeee; }
        .meta-table td.label { font-weight: bold; width: 120px; color: #666666; }
        .message-box { padding: 15px; background: #f9f9f9; border-left: 4px solid #8b5cf6; border-radius: 4px; font-style: italic; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>AURA Biomedical Intelligence Support</div>
        <table class='meta-table'>
            <tr>
                <td class='label'>Sender Name:</td>
                <td>" . htmlspecialchars($name) . "</td>
            </tr>
            <tr>
                <td class='label'>Sender Email:</td>
                <td><a href='mailto:" . htmlspecialchars($email) . "'>" . htmlspecialchars($email) . "</a></td>
            </tr>
            <tr>
                <td class='label'>Category:</td>
                <td>" . htmlspecialchars(ucfirst($category)) . "</td>
            </tr>
            <tr>
                <td class='label'>Submitted IP:</td>
                <td>" . htmlspecialchars($_SERVER['REMOTE_ADDR']) . "</td>
            </tr>
            <tr>
                <td class='label'>Time (UTC):</td>
                <td>" . gmdate('Y-m-d H:i:s') . "</td>
            </tr>
        </table>
        
        <h3>Message details:</h3>
        <div class='message-box'>" . htmlspecialchars($message) . "</div>
    </div>
</body>
</html>
";

// Construct headers
$headers = "MIME-Version: 1.0" . "\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8" . "\r\n";
$headers .= "From: AURA Support Engine <noreply@" . $_SERVER['HTTP_HOST'] . ">" . "\r\n";
$headers .= "Reply-To: " . $name . " <" . $email . ">" . "\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

// Send email
$mail_sent = false;

// Only trigger mail if real recipient email is configured
if ($to_email !== 'your-email@example.com') {
    $mail_sent = @mail($to_email, $email_subject, $email_body, $headers);
} else {
    // If not configured, mock success for development/preview sandbox purposes
    $mail_sent = true;
}

if ($mail_sent) {
    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "message" => "Your message has been sent successfully to the AURA support queue."
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Internal Server Error. The PHP mail service failed to dispatch the email request."
    ]);
}
?>
