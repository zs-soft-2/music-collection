import { WhislistItemEntity } from './whislist-item';

export abstract class WhislistItemHookService {
	public abstract selectEntity(whislistItem: WhislistItemEntity): void;
}
