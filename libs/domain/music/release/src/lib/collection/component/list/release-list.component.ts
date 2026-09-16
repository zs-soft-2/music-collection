import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { BaseComponent, ReleaseListParams } from '@music-collection/api';

import { ReleaseListService } from './release-list.service';
import { Bind } from 'primeng/bind';
import { Carousel } from 'primeng/carousel';
import { ReleaseSimpleViewComponent } from '../../../view/component/simple/release-simple-view.component';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ReleaseListService],
	selector: 'mc-release-list',
	templateUrl: './release-list.component.html',
	styleUrls: ['./release-list.component.scss'],
	imports: [
		Bind,
		Carousel,
		ReleaseSimpleViewComponent,
		AsyncPipe,
	],
})
export class ReleaseListComponent extends BaseComponent implements OnInit {
	private componentService = inject(ReleaseListService);

	public params$!: Observable<ReleaseListParams>;

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}
}
