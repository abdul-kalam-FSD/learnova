import { NavLink } from "react-router-dom";
import "../Nav.css";

const tabs = [
  { path: "/home", label: "Home", icon: "🏠" },
  { path: "/subjects", label: "Chapters", icon: "📚" },
  { path: "/practice", label: "Practice", icon: "🎯" },
  { path: "/progress", label: "Progress", icon: "📊" },
];

function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="nav fixed bottom-0 left-0 right-0 border-t
                     flex py-1.5 md:static md:flex-col
                     md:w-48 md:h-[calc(100vh-56px)] md:border-t-0 md:border-r md:py-6"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `nav__link${isActive ? " nav__link--active" : ""} flex-1 min-w-0 md:flex-none flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 px-1 py-1.5 md:px-3 text-[10px] xs:text-[11px] md:text-sm`
          }
        >
          <span aria-hidden="true">{tab.icon}</span>
          <span className="truncate max-w-full">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;