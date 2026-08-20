import { useContext } from "react";
import { SessionContext, type SessionState } from "./SessionProvider";

export function useSession(): SessionState {
  const state = useContext(SessionContext);
  if (!state) {
    throw new Error("useSession precisa ser usado dentro de SessionProvider.");
  }
  return state;
}
