# Upload Functionality Testing Guide

## ✅ What's Been Implemented

### Backend Upload API
- **Endpoints Created:**
  - `POST /api/upload/logo` - Upload company logos (max 5MB)
  - `POST /api/upload/video` - Upload demo videos (max 500MB)
  - `POST /api/upload/document` - Upload documents (max 10MB)
  - `DELETE /api/upload/file` - Delete uploaded files
  - `GET /api/upload/signed-url/:key` - Get signed URLs for private access

- **Storage Configuration:**
  - AWS S3 support (when configured with credentials)
  - Local file storage fallback for development
  - Automatic directory creation
  - Unique filename generation with timestamps

### Frontend Components

#### 1. LogoManager Component (`/components/admin/LogoManager.tsx`)
- ✅ **Drag-and-drop** file upload
- ✅ **Click to browse** file selection
- ✅ **URL input** option (kept for flexibility)
- ✅ **Upload progress** indicator
- ✅ **File validation** (type and size)
- ✅ **Preview** functionality
- ✅ **Delete** capability

#### 2. DemoUploadList Component (`/components/ui/demo-upload-list.tsx`)
- ✅ **Drag-and-drop** video upload
- ✅ **Multiple video** management
- ✅ **Upload status** indicators
- ✅ **File validation** (video formats, 500MB limit)
- ✅ **URL input** option for YouTube/Vimeo links
- ✅ **Title and description** fields

## 🧪 How to Test

### Step 1: Access Admin Dashboard
1. Navigate to http://localhost:3002/admindashboard
2. Login with admin credentials
3. Go to Partners section

### Step 2: Test Logo Upload
1. Create or edit a partner
2. In Step 8 (Pre-onboarding), find the "Company Logo" section
3. Click "Upload" button
4. Try these test scenarios:
   - **Drag & Drop**: Drag an image file onto the upload area
   - **Click to Browse**: Click "Choose File" to select an image
   - **File Types**: Test with JPG, PNG, SVG, WebP files
   - **Size Limit**: Try a file over 5MB (should show error)

### Step 3: Test Video Demo Upload
1. In the same Step 8, find "Client Demos" section
2. Click "Add Client Demo"
3. Enter a title and description
4. Try these test scenarios:
   - **Upload Video**: Click "Upload" and select a video file
   - **Drag & Drop**: Drag a video file onto the form area
   - **URL Option**: Paste a YouTube URL instead
   - **Multiple Videos**: Add 2-3 demo videos
   - **Size Limit**: Videos up to 500MB are supported

### Step 4: Verify Storage
- **Local Development**: Files are stored in `tpe-backend/uploads/` directory
  - Logos: `tpe-backend/uploads/logos/`
  - Videos: `tpe-backend/uploads/videos/`
- **URLs**: Uploaded files are served at `http://localhost:5000/uploads/[type]/[filename]`

## 🔧 Configuration

### For AWS S3 (Production)
Edit `tpe-backend/.env.development` or `.env.production`:
```env
AWS_ACCESS_KEY_ID=your-actual-key-here
AWS_SECRET_ACCESS_KEY=your-actual-secret-here
AWS_S3_BUCKET=tpe-uploads
AWS_REGION=us-east-1
```

### Current Status
- ✅ Using **local storage** for development (AWS not configured)
- ✅ Files persist between sessions
- ✅ URLs are generated for uploaded files
- ✅ Authentication required for uploads

## 📝 Important Notes

1. **File Size Limits:**
   - Logos: 5MB max
   - Videos: 500MB max
   - Documents: 10MB max

2. **Supported Formats:**
   - Images: JPG, PNG, SVG, WebP
   - Videos: MP4, MPEG, MOV, WebM
   - Documents: PDF, DOC, DOCX

3. **Security:**
   - All uploads require authentication
   - Files are uniquely named with timestamps
   - Original filenames are preserved in metadata

4. **User Experience:**
   - Visual feedback during upload
   - Progress indicators for large files
   - Clear error messages for validation failures
   - Drag-and-drop zones highlight on hover

## 🚀 Next Steps for Production

1. **Configure AWS S3:**
   - Create S3 bucket
   - Set up IAM user with proper permissions
   - Update environment variables with real credentials

2. **CDN Integration:**
   - Set up CloudFront for faster delivery
   - Configure caching policies

3. **Image Optimization:**
   - Add automatic resizing for logos
   - Generate thumbnails for videos

4. **Monitoring:**
   - Track upload success/failure rates
   - Monitor storage usage
   - Set up alerts for failures