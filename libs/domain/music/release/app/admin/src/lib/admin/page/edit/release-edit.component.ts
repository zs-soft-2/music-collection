import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';
import { ReleaseFormModule } from '@music-collection/domain/release';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-edit',
	templateUrl: './release-edit.component.html',
	styleUrls: ['./release-edit.component.scss'],
	imports: [ReleaseFormModule, Tab, TabList, TabPanel, TabPanels, Tabs],
})
export class ReleaseEditComponent extends BaseComponent implements OnInit {
	private activatedRoute = inject(ActivatedRoute);

	public releaseId!: string;
	/** A new pressing (`edit/0`) has no tracks of its own yet. */
	public isExisting = false;

	public ngOnInit(): void {
		this.releaseId = this.activatedRoute.snapshot.params['releaseId'];
		this.isExisting = !!this.releaseId && this.releaseId !== '0';
	}
}
