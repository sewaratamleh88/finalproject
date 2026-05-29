# Task & Meeting Management System

## Project Description
A full-stack web application for managing tasks and meetings with a clear workflow between users and administrators.

Users can create tasks, mark them as done, and submit them for review.  
Administrators can approve or reject tasks and provide feedback.

The system also includes a meetings calendar where users can create, edit, and view meetings by date.

---

## Features

### Task Management
- Create, update, and delete tasks
- Mark tasks as completed
- Admin review system (approve / reject)
- Feedback loop between admin and user

### Meetings Management
- Create and edit meetings
- View meetings by selected date
- Prevent creating or editing meetings in the past
- Interactive calendar with daily view

### Roles and Permissions
- User: manages personal tasks and meetings
- Admin: reviews submitted tasks and controls workflow

### UI and UX
- Clean and modern interface
- List-based layout for better readability
- Hover effects and smooth transitions
- Friendly date format for better user experience

### Validation and Security
- Input validation on both client and server
- Prevent invalid or past-date meetings
- Role-based access control

---

## Testing
Basic UI testing was implemented using React Testing Library and Jest.

Covered scenarios include:
- Preventing creation of meetings with past dates
- Displaying validation errors inside modals
- Rendering meetings list by selected date
- Handling empty state
- User interaction (click events)

---

## Technologies
- React + TypeScript
- Vite
- Node.js + Express
- MongoDB (Atlas)
- Mongoose
- React Query
- CSS
- Jest + React Testing Library

---

## How to Run

### Install dependencies
```bash
npm install