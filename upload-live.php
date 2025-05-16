<?php
// Production-ready upload script for Profundi platform
// No CORS headers needed as this will be served from the same domain as the frontend

// Check if the request is a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Get the user ID from the request
$userId = isset($_POST['userId']) ? $_POST['userId'] : null;

if (!$userId) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID is required']);
    exit();
}

// Sanitize the user ID to prevent directory traversal attacks
$userId = preg_replace('/[^a-zA-Z0-9]/', '', $userId);

// Create user-specific directories if they don't exist
$profileDir = __DIR__ . "uploads/profile-images/{$userId}";
$idDocDir = __DIR__ . "uploads/id-documents/{$userId}";

if (!file_exists($profileDir)) {
    mkdir($profileDir, 0755, true);
}

if (!file_exists($idDocDir)) {
    mkdir($idDocDir, 0755, true);
}

$response = ['success' => false];

// Handle profile image upload
if (isset($_FILES['profileImage']) && $_FILES['profileImage']['error'] === UPLOAD_ERR_OK) {
    $profileImage = $_FILES['profileImage'];

    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $fileType = $finfo->file($profileImage['tmp_name']);
    
    if (!in_array($fileType, $allowedTypes)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid profile image format. Only JPG and PNG are allowed.']);
        exit();
    }

    // Validate file size (max 2MB)
    if ($profileImage['size'] > 2 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['error' => 'Profile image must be less than 2MB']);
        exit();
    }

    // Generate a unique filename
    $profileExt = strtolower(pathinfo($profileImage['name'], PATHINFO_EXTENSION));
    $profileFilename = "profile-" . time() . "-" . bin2hex(random_bytes(8)) . "." . $profileExt;
    $profilePath = "{$profileDir}/{$profileFilename}";

    // Move the uploaded file to the destination
    if (move_uploaded_file($profileImage['tmp_name'], $profilePath)) {
        // Return the relative path for use in the frontend
        $relativePath = str_replace(__DIR__, '', $profilePath);
        $response['profileImagePath'] = $relativePath;
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to upload profile image']);
        exit();
    }
}

// Handle ID document upload
if (isset($_FILES['idDocument']) && $_FILES['idDocument']['error'] === UPLOAD_ERR_OK) {
    $idDocument = $_FILES['idDocument'];

    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $fileType = $finfo->file($idDocument['tmp_name']);
    
    if (!in_array($fileType, $allowedTypes)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid ID document format. Only JPG, PNG, and PDF are allowed.']);
        exit();
    }

    // Validate file size (max 5MB)
    if ($idDocument['size'] > 5 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['error' => 'ID document must be less than 5MB']);
        exit();
    }

    // Generate a unique filename
    $idExt = strtolower(pathinfo($idDocument['name'], PATHINFO_EXTENSION));
    $idFilename = "id-doc-" . time() . "-" . bin2hex(random_bytes(8)) . "." . $idExt;
    $idPath = "{$idDocDir}/{$idFilename}";

    // Move the uploaded file to the destination
    if (move_uploaded_file($idDocument['tmp_name'], $idPath)) {
        // Return the relative path for use in the frontend
        $relativePath = str_replace(__DIR__, '', $idPath);
        $response['idDocumentPath'] = $relativePath;
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to upload ID document']);
        exit();
    }
}

// If we got here, at least one file was uploaded successfully
if (isset($response['profileImagePath']) || isset($response['idDocumentPath'])) {
    $response['success'] = true;
    echo json_encode($response);
} else {
    http_response_code(400);
    echo json_encode(['error' => 'No files were uploaded']);
}
?>
