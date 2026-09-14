import { useNavigate } from "react-router-dom";
import { markBackIntent } from "./navigationIntent";
export function useBackNavigation() {
  const navigate = useNavigate();
  return (to) => {
    markBackIntent();
    if (to === undefined) {
      navigate(-1);
    } else {
      navigate(to);
    }
  };
}