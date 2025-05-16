# Profundi – Service Provider Booking Platform

Profundi is a full-featured web application for connecting clients with verified service providers. It supports user and provider registration, profile management, bookings, admin controls, document uploads, and more. Built with React, Firebase, and PHP, Profundi is designed for the South African market but can be adapted for other regions.

---

## Features

- **User Registration & Login** (with security questions and password reset)
- **Service Provider Registration** (with ID and profile image upload, profession, and location)
- **Admin Dashboard** (verify providers, manage users, view stats, handle booking/cancellation requests)
- **Provider Dashboard** (manage bookings, availability, services, reliability score, and profile)
- **Booking System** (users can book providers, select services, schedule, and location)
- **Document & Image Uploads** (handled via PHP backend, stored in `/uploads`)
- **Notifications** (for booking status, cancellations, and admin actions)
- **Search & Filter** (find providers by name, profession, or location)
- **Ratings & Reviews** (users can review providers)
- **Subscription Management** (users can subscribe for booking privileges)
- **Responsive UI** (mobile-friendly, modern design)
- **Security** (role-based access, document verification, account suspension)

---

## Tech Stack

- **Frontend:** React, React Router, React Icons, CSS
- **Backend:** Firebase Firestore (data), Firebase Auth (authentication), PHP (file uploads)
- **Other:** Node.js, npm, Create React App

---

## Project Structure

```
projectconnect/
├── public/                # Static files, images, upload endpoint
├── src/
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React context providers
│   ├── data/              # Static data (professions, etc.)
│   ├── hooks/             # Custom React hooks
│   ├── models/            # Data models and Firestore logic
│   ├── pages/             # Main app pages (Home, Booking, Admin, etc.)
│   ├── utils/             # Utility functions (image, notification, etc.)
│   ├── App.js             # Main app component
│   └── firebase.js        # Firebase config
├── upload.php             # PHP backend for file uploads
├── package.json           # Project metadata and dependencies
└── README.md              # Project documentation
```

---

## Setup & Installation

1. **Clone the repository:**
   ```powershell
   git clone https://github.com/your-username/profundi.git
   cd profundi
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Configure Firebase:**
   - Copy `src/config.js.example` to `src/config.js` and fill in your Firebase project details.

4. **Set up PHP backend:**
   - Ensure `upload.php` is accessible via your web server (e.g., XAMPP).
   - The `/uploads` directory must be writable.

5. **Start the development server:**
   ```powershell
   npm start
   ```
   - Visit [http://localhost:3000](http://localhost:3000)

---

## Usage

- **Users:** Register, search for providers, book services, manage bookings, and leave reviews.
- **Providers:** Register, upload documents, manage profile, set availability, and handle bookings.
- **Admins:** Verify providers, manage users, oversee bookings, and handle disputes.

---

## Customization

- **Professions:** Edit `src/utils/professionsList.js` to add or remove professions.
- **Styling:** Modify CSS files in `src/components/` and `src/pages/` for custom branding.
- **Backend:** Update `upload.php` for custom file handling or storage.

---

## License

This project is provided as-is for demonstration and customization. For commercial use, please consult the repository owner.

---

## Credits

- Built with [React](https://reactjs.org/), [Firebase](https://firebase.google.com/), and [PHP](https://www.php.net/).
- Icons by [React Icons](https://react-icons.github.io/react-icons/).
