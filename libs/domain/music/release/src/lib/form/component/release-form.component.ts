import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	computed,
	inject,
	signal,
} from '@angular/core';
import {
	DiscogsVersion,
	ReleaseExternalField,
	ReleaseFormParams,
	BaseComponent,
	discogsReleaseUrl,
} from '@music-collection/api';

import { ReleaseFormService } from './release-form.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { AutoComplete } from 'primeng/autocomplete';
import { InputText } from 'primeng/inputtext';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { MultiSelect } from 'primeng/multiselect';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { ColorPicker } from 'primeng/colorpicker';
import { Dialog } from 'primeng/dialog';
import { AsyncPipe } from '@angular/common';

/** What one pressing is searched by on the chooser, as one line of text. */
function versionText(version: DiscogsVersion): string {
	return [
		version.title,
		version.format,
		version.label,
		version.catno,
		version.country,
		version.year,
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
}

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ReleaseFormService],
	selector: 'mc-release-form',
	templateUrl: './release-form.component.html',
	styleUrls: ['./release-form.component.scss'],
	imports: [
		...I18N_IMPORTS,
		FormsModule,
		ReactiveFormsModule,
		Bind,
		AutoComplete,
		InputText,
		DatePicker,
		Select,
		MultiSelect,
		Button,
		Checkbox,
		ColorPicker,
		Dialog,
		AsyncPipe,
	],
})
export class ReleaseFormComponent extends BaseComponent implements OnInit {
	private componentService = inject(ReleaseFormService);

	public params$!: Observable<ReleaseFormParams>;

	public readonly coverColor = this.componentService.coverColor;
	public readonly externalComparison =
		this.componentService.externalComparison;
	public readonly externalError = this.componentService.externalError;
	public readonly externalLoading = this.componentService.externalLoading;
	public readonly externalVersions = this.componentService.externalVersions;
	public readonly hasSelectedExternalRow = computed(
		() => !!this.externalComparison()?.rows.some((row) => row.selected)
	);
	/**
	 * A master can carry hundreds of pressings, so the chooser is searched
	 * rather than scrolled: the year, the country, the catalog number and
	 * the format are all on one line, and all of them are typed into here.
	 */
	public readonly versionFilter = signal('');
	public readonly filteredVersions = computed(() => {
		const versions = this.externalVersions() ?? [];
		const term = this.versionFilter().trim().toLowerCase();

		return term
			? versions.filter((version) => versionText(version).includes(term))
			: versions;
	});

	public readonly discogsReleaseUrl = discogsReleaseUrl;

	public applyExternal(): void {
		this.componentService.applyExternal();
	}

	public cancel(): void {
		this.componentService.cancel();
	}

	public chooseExternalVersion(version: DiscogsVersion): void {
		this.componentService.chooseExternalVersion(version);
	}

	public clearCoverColor(): void {
		this.componentService.clearCoverColor();
	}

	public closeExternal(): void {
		this.componentService.closeExternal();
	}

	public closeExternalVersions(): void {
		this.componentService.closeExternalVersions();
	}

	public loadExternal(): void {
		this.versionFilter.set('');
		void this.componentService.loadExternal();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public submit(): void {
		this.componentService.submit();
	}

	public toggleExternalRow(field: ReleaseExternalField): void {
		this.componentService.toggleExternalRow(field);
	}

	public searchAlbumHandler(event: any): void {
		this.componentService.searchAlbum(event['query']);
	}

	public searchArtistHandler(event: any): void {
		this.componentService.searchArtist(event['query']);
	}

	public searchLabelHandler(event: any): void {
		this.componentService.searchLabel(event['query']);
	}
}
