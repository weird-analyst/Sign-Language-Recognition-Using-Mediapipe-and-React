# Local Setup Guide - Sign Language Recognition

This guide will help you run the Sign Language Recognition app **completely locally** without Firebase Storage.

## What's Been Set Up

✅ **Model is now local**: The trained model (`sign_language_recognizer_25-04-2023.task`) has been copied to the `public` folder and will be served locally by the React dev server.

✅ **Environment configured**: The `.env.local` file has been updated to use the local model path.

## Quick Start

### 1. Install Dependencies (if not already done)
```bash
npm install
```

### 2. Start the Development Server
```bash
npm start
```

The app will open at `http://localhost:3000`

## How It Works

- **Model Loading**: Instead of fetching from Firebase Storage, the model is now loaded from `/sign_language_recognizer_25-04-2023.task` which is served from your local `public` folder.

- **Firebase Authentication**: The app still uses Firebase for user authentication. If you want to test without authentication, you can modify the code to bypass the auth check (see Optional Modifications below).

## Optional Modifications

### Running Without Firebase Authentication

If you want to run completely without Firebase, you can modify the app to skip authentication:

1. Open `src/components/Detect/Detect.jsx`
2. Find the line with `{accessToken ? (` (around line 229)
3. Change it to just show the content without the auth check

Or simply create a mock user in the Redux store.

### Using a Different Model

If you want to use a different trained model:
1. Place your `.task` file in the `public` folder
2. Update the path in `.env.local`:
   ```
   REACT_APP_FIREBASE_STORAGE_TRAINED_MODEL_25_04_2023=/your-model-name.task
   ```

## Project Structure

```
public/
  └── sign_language_recognizer_25-04-2023.task  ← Your model file
src/
  ├── components/
  │   └── Detect/
  │       └── Detect.jsx                         ← Main detection component
  ├── firebase.js                                ← Firebase config (only for auth)
  └── ...
.env.local                                       ← Environment variables
```

## Troubleshooting

### Model Not Loading
- Check browser console for errors
- Verify the model file exists at `public/sign_language_recognizer_25-04-2023.task`
- Ensure the path in `.env.local` matches the filename

### CORS Errors
- This shouldn't happen with local files, but if you see CORS errors, make sure you're accessing the app through `http://localhost:3000` and not `file://`

### Authentication Issues
- If you don't want to use Firebase auth, you can modify the code to bypass it
- Or set up a minimal Firebase project (free tier) just for authentication

## Next Steps

1. **Start the app**: `npm start`
2. **Click "Start"** in the Detect section
3. **Allow camera access** when prompted
4. **Start signing!** The model will recognize your signs in real-time

## Notes

- The model runs entirely in your browser using MediaPipe
- No data is sent to any server (except Firebase if you use authentication)
- Camera access stays local to your machine
- The model file is ~9MB and loads once when you first visit the Detect page

Enjoy your locally-running sign language recognition system! 🤟
