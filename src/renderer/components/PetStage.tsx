import type { PetViewState } from '../pet/stateMachine';

interface PetStageProps {
  viewState: PetViewState;
  onPetClick: () => void;
}

export function PetStage({ viewState, onPetClick }: PetStageProps) {
  return (
    <button className={`pet-stage pet-${viewState.animation}`} onClick={onPetClick} aria-label="Claude Code 桌宠">
      <div className="pet-head">
        <span className="pet-eye pet-eye-left" />
        <span className="pet-eye pet-eye-right" />
      </div>
      <div className="pet-body">
        <span className="pet-badge">CC</span>
      </div>
      <div className="pet-state-label">{viewState.state}</div>
    </button>
  );
}
