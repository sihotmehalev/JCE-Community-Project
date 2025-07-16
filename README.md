# Talks from the Heart

A volunteer-based support platform built with React and Firebase.

This project was developed by students from Azrieli College of Engineering as part of a course requirement.

## Features

- User roles: Help Requesters, Volunteers, Managers
- Firebase Authentication
- Manual approval of volunteers
- Manual matching of help requests to volunteers
- Dashboards per user role

## Installation

1. Clone the repository
2. Run `npm install`
3. Configure your Firebase project in `.env`
4. Start the development server:
```bash
npm start
```

## Deployment

You can deploy the application to Firebase Hosting in one of two ways:

1. **Automatic (via GitHub Actions)**  
   Simply push your changes to the `master` branch. The workflow defined in  
   `.github/workflows/firebase-deploy.yml` will automatically build and deploy  
   your app to the `live` channel on Firebase Hosting.

2. **Manual (using a script)**  
   Run the provided batch script from your project root:

   ```bash
   ./build-and-deploy.bat

## .env Example

1.  Copy `.env.template` to a new `.env` file.
2.  Replace the placeholder values in `.env` with your actual environment variables.

## Tech Stack

- React
- Firebase (Auth + Firestore)
- Tailwind CSS
