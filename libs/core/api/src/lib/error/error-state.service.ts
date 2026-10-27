import { Observable } from 'rxjs';

import { BaseService } from '@music-collection/common/api';
import { AppError } from './app-error.model';

export abstract class ErrorStateService extends BaseService {
	public abstract dispatchReport(
		error: Pick<AppError, 'message' | 'source'> & Partial<AppError>
	): void;
	public abstract dispatchDismiss(uid: string): void;
	public abstract dispatchDismissAll(): void;
	public abstract selectErrors$(): Observable<AppError[]>;
}
