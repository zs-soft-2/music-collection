import { ReplaySubject, Subject, takeUntil } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

import { TopBarParams } from '../../api';
import { TopBarService } from './top-bar.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [TopBarService],
	selector: 'mc-top-bar',
	styleUrls: ['./top-bar.component.scss'],
	templateUrl: './top-bar.component.html',
})
export class TopBarComponent extends BaseComponent implements OnInit {
	public params$$: Subject<TopBarParams>;

	public constructor(private componentService: TopBarService) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public ngOnInit(): void {
		this.componentService
			.init$()
			.pipe(takeUntil(this.destroy))
			.subscribe((topBarParams) => this.params$$.next(topBarParams));
	}
}
