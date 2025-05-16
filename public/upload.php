<?php
// Set headers to allow cross-origin requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check if the request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Check if file was uploaded
if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded']);
    exit();
}

$file = $_FILES['file'];

// Check for upload errors
if ($file['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE => 'The uploaded file exceeds the upload_max_filesize directive in php.ini',
        UPLOAD_ERR_FORM_SIZE => 'The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form',
        UPLOAD_ERR_PARTIAL => 'The uploaded file was only partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the file upload'
    ];
    
    $errorMessage = isset($errorMessages[$file['error']]) 
        ? $errorMessages[$file['error']] 
        : 'Unknown upload error';
    
    http_response_code(400);
    echo json_encode(['error' => $errorMessage]);
    exit();
}

// Get file info
$fileName = $file['name'];
$fileType = $file['type'];
$fileSize = $file['size'];
$fileTmpPath = $file['tmp_name'];

// Validate file type
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
if (!in_array($fileType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type. Only JPG, PNG, GIF, and PDF files are allowed.']);
    exit();
}

// Validate file size (max 5MB)
$maxSize = 5 * 1024 * 1024; // 5MB in bytes
if ($fileSize > $maxSize) {
    http_response_code(400);
    echo json_encode(['error' => 'File is too large. Maximum size is 5MB.']);
    exit();
}

// Get upload type from request
$uploadType = isset($_POST['type']) ? $_POST['type'] : 'profile';

// Create upload directory if it doesn't exist
$uploadDir = 'uploads/' . $uploadType . '/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Generate a unique filename to prevent overwriting
$uniqueFileName = uniqid() . '_' . $fileName;
$uploadPath = $uploadDir . $uniqueFileName;

// Move the uploaded file to the destination
if (move_uploaded_file($fileTmpPath, $uploadPath)) {
    // Return success response with file path
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'filePath' => '/' . $uploadPath, // Return path relative to the domain root
        'fileName' => $uniqueFileName,
        'fileType' => $fileType,
        'fileSize' => $fileSize
    ]);
} else {
    // Return error response
    http_response_code(500);
    echo json_encode(['error' => 'Failed to upload file']);
}
