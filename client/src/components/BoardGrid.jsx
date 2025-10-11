import BoardCard from './BoardCard';

const BoardGrid = ({ boards, onOpenBoard, onDeleteBoard, deletingId, userId }) => {
  if (!boards || boards.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl text-gray-400">📋</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No boards yet
        </h3>
        <p className="text-gray-500 max-w-sm">
          Create your first board to start organizing your ideas and collaborating with others.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {boards.map((board) => {
        const isOwner = board.ownerId === userId;
        return (
          <BoardCard
            key={board.id}
            board={board}
            onOpen={onOpenBoard}
            onDelete={onDeleteBoard}
            isOwner={isOwner}
            isDeleting={deletingId === board.id}
          />
        );
      })}
    </div>
  );
}

export default BoardGrid