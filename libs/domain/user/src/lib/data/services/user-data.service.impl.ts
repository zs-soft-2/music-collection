import { from, Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	collection,
	collectionData,
	CollectionReference,
	doc,
	docData,
	DocumentData,
	Firestore,
	setDoc,
	updateDoc,
} from '@angular/fire/firestore';
import { User, UserDataService } from '@music-collection/api';

import { USER_FEATURE_KEY } from '../../store/state/user.reducer';

@Injectable()
export class UserDataServiceImpl extends UserDataService {
	private userCollection: CollectionReference<DocumentData>;

	public constructor(private firestore: Firestore) {
		super();

		this.userCollection = collection(this.firestore, USER_FEATURE_KEY);
	}

	public add$(user: User): Observable<User> {
		return from(
			setDoc(doc(this.userCollection, user.uid), user)
		) as unknown as Observable<User>;
	}

	public delete$(user: User): Observable<User> {
		return this.update$(user);
	}

	public list$(): Observable<User[]> {
		return collectionData(this.userCollection, {
			idField: 'uid',
		}) as Observable<User[]>;
	}

	public load$(uid: string): Observable<User | undefined> {
		const userDocument = doc(this.firestore, `${USER_FEATURE_KEY}/${uid}`);

		return docData(userDocument, { idField: 'uid' }) as Observable<User>;
	}

	public update$(user: User): Observable<User> {
		const userDocument = doc(
			this.firestore,
			`${USER_FEATURE_KEY}/${user.uid}`
		);

		return from(
			updateDoc(userDocument, { ...user })
		) as unknown as Observable<User>;
	}
}
