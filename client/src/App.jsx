import Board from "./components/Board";

export default function App() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-2xl font-bold mb-6">💡 ThinkSpace Board</h1>
      <Board />
    </div>
  );
}
