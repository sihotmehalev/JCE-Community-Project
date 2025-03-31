# Talks from the Heart

A volunteer-based support platform built with React and Firebase.

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

## Firebase Setup

Make sure you enable:
- Authentication (Email/Password + Anonymous if needed)
- Firestore Database

## .env Example

See the `.env.example` file for what needs to be filled.

## Tech Stack

- React
- Firebase (Auth + Firestore)
- Tailwind CSS