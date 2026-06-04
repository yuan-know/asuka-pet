import type { FileAction } from '../../shared/eventTypes';

interface ActionMenuProps {
  fileCount: number;
  onSelect: (action: FileAction) => void;
}

export function ActionMenu({ fileCount, onSelect }: ActionMenuProps) {
  return (
    <div className="action-menu">
      <div className="action-menu-title">收到 {fileCount} 个文件</div>
      <button onClick={() => onSelect('send_to_claude')}>交给 Claude 看看</button>
      <button onClick={() => onSelect('add_to_project_context')}>加入当前项目资料</button>
      <button onClick={() => onSelect('record_only')}>只记录路径</button>
      <button onClick={() => onSelect('cancel')}>取消</button>
    </div>
  );
}
