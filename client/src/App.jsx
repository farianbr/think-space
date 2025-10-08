import { useState } from "react";
import Header from "./components/Header";
import Board from "./components/Board";

export default function App() {
  const [authedUser, setAuthedUser] = useState(null);

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <Header onAuthChange={setAuthedUser} />
      
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          <Board />
        </div>
      </main>
    </div>
  );
}
