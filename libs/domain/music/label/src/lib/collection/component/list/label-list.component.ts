import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { BaseComponent } from '@music-collection/api';

import { LabelListService } from './label-list.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [LabelListService],
	selector: 'mc-label-list',
	templateUrl: './label-list.component.html',
	styleUrls: ['./label-list.component.scss'],
})
export class LabelListComponent extends BaseComponent implements OnInit {
	private componentService = inject(LabelListService);

	public ngOnInit(): void {
		this.componentService.init$().pipe().subscribe();
	}
}
