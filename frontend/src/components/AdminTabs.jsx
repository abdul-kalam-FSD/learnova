import { NavLink } from "react-router-dom";
import "../Admin.css";

function AdminTabs() {
  return (
    <div className="admin-page__tabs mb-4">
      <NavLink
        to="/admin"
        end
        className={({ isActive }) =>
          `admin-page__tab${isActive ? " admin-page__tab--active" : ""}`
        }
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/admin/students"
        className={({ isActive }) =>
          `admin-page__tab${isActive ? " admin-page__tab--active" : ""}`
        }
      >
        Students
      </NavLink>
      <NavLink
        to="/admin/results"
        className={({ isActive }) =>
          `admin-page__tab${isActive ? " admin-page__tab--active" : ""}`
        }
      >
        Results
      </NavLink>
      <NavLink
        to="/admin/staff"
        className={({ isActive }) =>
          `admin-page__tab${isActive ? " admin-page__tab--active" : ""}`
        }
      >
        Staff
      </NavLink>
      <NavLink
        to="/admin/content"
        className={({ isActive }) =>
          `admin-page__tab${isActive ? " admin-page__tab--active" : ""}`
        }
      >
        Content
      </NavLink>
      <NavLink
        to="/admin/game-content"
        className={({ isActive }) =>
          `admin-page__tab${isActive ? " admin-page__tab--active" : ""}`
        }
      >
        Game Content
      </NavLink>
      <NavLink
        to="/admin/cases"
        className={({ isActive }) =>
          `admin-page__tab${isActive ? " admin-page__tab--active" : ""}`
        }
      >
        Cases
      </NavLink>
      <NavLink
        to="/admin/sections"
        className={({ isActive }) =>
          `admin-page__tab${isActive ? " admin-page__tab--active" : ""}`
        }
      >
        Sections
      </NavLink>
    </div>
  );
}

export default AdminTabs;
