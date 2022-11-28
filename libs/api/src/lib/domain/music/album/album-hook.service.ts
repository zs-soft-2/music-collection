import { AlbumEntity } from './album';

export abstract class AlbumHookService {
	public abstract selectEntity(artist: AlbumEntity): void;
}
