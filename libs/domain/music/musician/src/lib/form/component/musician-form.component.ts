import { Observable } from 'rxjs';

import { AsyncPipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BaseComponent, MusicianFormParams } from '@music-collection/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import { MusicianFormService } from './musician-form.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [MusicianFormService],
	selector: 'mc-musician-form',
	templateUrl: './musician-form.component.html',
	styleUrls: ['./musician-form.component.scss'],
	imports: [ReactiveFormsModule, InputText, Textarea, Button, AsyncPipe],
})
export class MusicianFormComponent extends BaseComponent implements OnInit {
	private componentService = inject(MusicianFormService);

	public params$!: Observable<MusicianFormParams>;

	public cancel(): void {
		this.componentService.cancel();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public submit(): void {
		this.componentService.submit();
	}
}
