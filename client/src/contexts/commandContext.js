import { createContext, useContext } from "react";

/** { open: boolean, openCommand(query?), closeCommand() } */
export const CommandContext = createContext(null);

export function useCommand() {
  return useContext(CommandContext) || { open: false, openCommand: () => {}, closeCommand: () => {} };
}
