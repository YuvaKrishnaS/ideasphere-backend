# IdeaSphere Backend API

India's first student-only social media platform backend API.

---

## Features

- User registration, authentication, and profile management
- Posting and managing Bits (short posts) and Stacks (tutorial series)
- Following system with notifications
- Real-time chat and collaboration using Socket.IO
- Reputation and interaction tracking
- File upload and management using Filebase (S3 compatible storage)
- Reporting and moderation tools
- AI-powered content recommendations

---

## Technology Stack

- Node.js and Express.js for API
- Sequelize ORM with PostgreSQL (hosted on Railway)
- Socket.IO for real-time functionalities
- Filebase for S3-compatible decentralized file storage
- Multer for file uploads
- AWS SDK for S3 operations
- JWT for authentication

---

## Prerequisites

- Node.js (v18.x recommended)
- PostgreSQL database (Railway integrates easily)
- Filebase account for the S3-compatible file storage
- Git and GitHub for version control

---

## Installation

1. Clone the repository

```bash
git clone https://github.com/YuvaKrishnaS/ideasphere-backend.git
cd ideasphere-backend
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env` file in the project root and add the following:

```
PORT=3000
DATABASE_URL=your_postgres_url
JWT_SECRET=your_jwt_secret_key
R2_ACCESS_KEY_ID=your_filebase_access_key_id
R2_SECRET_ACCESS_KEY=your_filebase_secret_access_key
R2_ENDPOINT=https://s3.filebase.com
R2_BUCKET_NAME=your_bucket_name
FRONTEND_URL=http://localhost:3000
EMAIL_HOST=smtp.your-email.com
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-password
```

4. Run migrations (optional if sync is enabled):

```bash
node scripts/migrate.js
```

5. Start development server

```bash
npm run dev
```

---

## Deployment

This backend API is ready to be deployed on Railway. Setup environment variables in Railway and push your changes to GitHub.

---

## API Documentation

API routes are organized under `/api`. Key endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/bits` - List bits
- `POST /api/upload/profile-image` - Upload profile image
- `GET /api/health` - Health check

Refer to the `routes` folder for more endpoints.

---

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests.

---

## License

This project is licensed under the MIT License.
