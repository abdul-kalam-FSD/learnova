import { NavLink } from "react-router-dom";
import "../Teacher.css";

function TeacherTabs() {
  return (
    <div className="teacher-page__tabs mb-4">
      <NavLink
        to="/teacher"
        end
        className={({ isActive }) =>
          `teacher-page__tab${isActive ? " teacher-page__tab--active" : ""}`
        }
      >
        Overview
      </NavLink>
      <NavLink
        to="/teacher/students"
        className={({ isActive }) =>
          `teacher-page__tab${isActive ? " teacher-page__tab--active" : ""}`
        }
      >
        Students
      </NavLink>
      <NavLink
        to="/teacher/weak-areas"
        className={({ isActive }) =>
          `teacher-page__tab${isActive ? " teacher-page__tab--active" : ""}`
        }
      >
        Weak Areas
      </NavLink>
      <NavLink
        to="/teacher/assignments"
        className={({ isActive }) =>
          `teacher-page__tab${isActive ? " teacher-page__tab--active" : ""}`
        }
      >
        Assignments
      </NavLink>
    </div>
  );
}

export default TeacherTabs;
