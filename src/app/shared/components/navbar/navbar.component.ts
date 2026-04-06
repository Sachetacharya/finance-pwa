import { Component, inject, output, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PwaService } from '../../../core/services/pwa.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  sidebarOpen = input<boolean>(false);
  toggleSidebar = output<void>();

  readonly auth = inject(AuthService);
  readonly pwa = inject(PwaService);
}
