import {
	calculateEffectivePermissions,
	isSameEffectivePermissions,
	roleReferences,
} from './effective-permissions';

const ADMIN = {
	id: 'role-1',
	name: 'ADMIN',
	permissions: ['ADMIN', 'createMusicianEntity'],
};
const EDITOR = {
	id: 'role-2',
	name: 'EDITOR',
	permissions: ['createMusicianEntity', 'updateMusicianEntity'],
};

describe('roleReferences', () => {
	it('a roleIds elemeit adja vissza', () => {
		expect([...roleReferences({ roleIds: ['role-1', 'role-2'] })]).toEqual([
			'role-1',
			'role-2',
		]);
	});

	it('a beágyazott roles uid-ját és nevét is hivatkozásnak veszi', () => {
		expect([...roleReferences({ roles: [{ uid: 'role-2', name: 'USER' }] })]).toEqual(
			['role-2', 'USER']
		);
	});

	it('a hibás alakú adatot kihagyja', () => {
		expect([
			...roleReferences({ roleIds: 'role-1', roles: [null, 42, {}] }),
		]).toEqual([]);
	});

	it('üres a hiányzó userre', () => {
		expect([...roleReferences(undefined)]).toEqual([]);
	});
});

describe('calculateEffectivePermissions', () => {
	it('egyesíti a szerepkörök permissionjeit, duplikátum nélkül, rendezve', () => {
		expect(
			calculateEffectivePermissions({ roleIds: ['role-1', 'role-2'] }, [
				ADMIN,
				EDITOR,
			])
		).toEqual({
			permissions: [
				'ADMIN',
				'createMusicianEntity',
				'updateMusicianEntity',
			],
			roles: ['ADMIN', 'EDITOR'],
		});
	});

	it('a beágyazott roles névre is illeszkedik', () => {
		expect(
			calculateEffectivePermissions({ roles: [{ name: 'EDITOR' }] }, [
				ADMIN,
				EDITOR,
			])
		).toEqual({
			permissions: ['createMusicianEntity', 'updateMusicianEntity'],
			roles: ['EDITOR'],
		});
	});

	it('a beágyazott permissionöket figyelmen kívül hagyja — a role dokumentum dönt', () => {
		expect(
			calculateEffectivePermissions(
				{ roles: [{ uid: 'role-2', permissions: ['ADMIN'] }] },
				[EDITOR]
			).permissions
		).toEqual(['createMusicianEntity', 'updateMusicianEntity']);
	});

	it('ismeretlen szerepkörre üres eredmény', () => {
		expect(
			calculateEffectivePermissions({ roleIds: ['role-9'] }, [ADMIN])
		).toEqual({ permissions: [], roles: [] });
	});

	it('szerepkör nélküli userre üres eredmény', () => {
		expect(calculateEffectivePermissions({}, [ADMIN])).toEqual({
			permissions: [],
			roles: [],
		});
	});
});

describe('isSameEffectivePermissions', () => {
	it('igaz az azonos állapotra', () => {
		expect(
			isSameEffectivePermissions(
				{ permissions: ['ADMIN'], roles: ['ADMIN'] },
				{ permissions: ['ADMIN'], roles: ['ADMIN'] }
			)
		).toBe(true);
	});

	it('hamis, ha a permissionök eltérnek', () => {
		expect(
			isSameEffectivePermissions(
				{ permissions: ['ADMIN'], roles: ['ADMIN'] },
				{ permissions: ['createMusicianEntity'], roles: ['ADMIN'] }
			)
		).toBe(false);
	});

	it('hamis, ha még nincs korábbi állapot', () => {
		expect(
			isSameEffectivePermissions(undefined, {
				permissions: [],
				roles: [],
			})
		).toBe(false);
	});
});
