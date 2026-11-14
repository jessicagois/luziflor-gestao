import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SyncService } from './core/sync.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App implements OnInit {
  private readonly sync = inject(SyncService);

  ngOnInit(): void {
    this.sync.iniciar();
  }
}
