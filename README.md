# Finance Dashboard Backend

Hey there! This is a simple yet solid backend system I built for managing a finance dashboard. It handles users with different roles, keeps track of income and expenses, and provides some handy dashboard summaries. I wanted to keep it clean, secure, and easy to understand.

## What It Does

- **User Management**: You can create users with roles like viewer, analyst, or admin. Each role has different permissions.
- **Role-Based Access**: Viewers can only look at data, analysts can add/edit records, and admins can manage everything.
- **Authentication**: Uses JWT tokens for secure login.
- **Finance Records**: Full CRUD operations for income and expense entries, with filtering and pagination.
- **Dashboard**: Quick summaries of total income, expenses, and trends over time.
- **Validation & Errors**: Everything is checked properly, and errors are handled nicely.
- **Data Storage**: Uses a simple JSON file for persistence (easy to set up).

## Getting Started

First, clone or download the project. Then:

```bash
cd d:/zorvyn-assign
npm install
npm start
```

The server will start on `http://localhost:4000`. You can change the port in the `.env` file if needed.

## How to Use the API

You'll need to register a user first (maybe an admin), then log in to get a token. Use that token in the `Authorization: Bearer <token>` header for protected routes.

### Authentication
- **Register**: `POST /api/auth/register` with `name`, `email`, `password`, `role` (viewer/analyst/admin)
- **Login**: `POST /api/auth/login` with `email`, `password` → returns user info and token

### Managing Users (Admin Only)
- **List Users**: `GET /api/users`
- **Get User**: `GET /api/users/:id`
- **Update User**: `PATCH /api/users/:id` with `name` or `role`
- **Delete User**: `DELETE /api/users/:id`

### Finance Records
- **List Records**: `GET /api/records` (add query params like `type=income`, `category=food`, `page=1`, `limit=10`)
- **Get Record**: `GET /api/records/:id`
- **Add Record**: `POST /api/records` with `type`, `amount`, `category`, `description`, `date` (analyst/admin)
- **Update Record**: `PUT /api/records/:id` (analyst/admin)
- **Delete Record**: `DELETE /api/records/:id` (analyst/admin)

### Dashboard
- **Summary**: `GET /api/dashboard/summary` → total income, expenses, net savings, record counts
- **Trends**: `GET /api/dashboard/trend?period=month` → monthly or yearly trends

## A Few Notes

- I used Node.js with Express for the server, lowdb for the database (it's just a JSON file), and libraries like Joi for validation and bcrypt for passwords.
- Roles are enforced strictly: viewers can't change anything, analysts can manage records, admins can do it all.
- Data is stored in `data/finance.json` – it's not a full database, but it's fine for this.
- If you want to add more features, like a frontend or better database, it should be easy to extend.

Feel free to check out the code or reach out if you have questions!
