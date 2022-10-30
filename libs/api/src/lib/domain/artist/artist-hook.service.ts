import { ArtistEntity } from './artist';

export abstract class ArtistHookService {
	public abstract selectEntity(artist: ArtistEntity): void;
}
