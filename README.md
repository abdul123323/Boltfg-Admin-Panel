# BoltFG Dashboard (React + Vite + JavaScript)

## Run
```
npm install
cp .env.example .env     # optional
npm run dev              # http://localhost:5173  (/api -> http://localhost:5000 proxy)
npm run build            # production build in dist/
```
Backend alag host par ho to `.env` mein `VITE_API_URL=https://your-host/api` set karein.

## Pages
Login, Dashboard, Leads, Lead Sources, Users, Roles (+permissions editor), Teams (+members), Permissions.
Sidebar items user ki permissions ke mutabiq show hote hain.
