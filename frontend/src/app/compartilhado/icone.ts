import { Component, input } from '@angular/core';

export type NomeIcone =
  | 'sacola' | 'caderno' | 'caixa' | 'nuvem' | 'nuvem-off' | 'sair' | 'voltar' | 'busca'
  | 'certo' | 'relogio' | 'atencao' | 'pessoa' | 'mais' | 'menos' | 'dinheiro' | 'cartao' | 'pix' | 'casa';

/** Ícones em SVG. São decorativos: o significado sempre vem também do texto ao lado. */
@Component({
  selector: 'app-icone',
  host: { 'aria-hidden': 'true', class: 'icone' },
  template: `
    <svg viewBox="0 0 24 24" [attr.width]="tamanho()" [attr.height]="tamanho()" fill="none"
         stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" focusable="false">
      @switch (nome()) {
        @case ('sacola') { <path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/> }
        @case ('caderno') { <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/> }
        @case ('caixa') { <path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/> }
        @case ('nuvem') { <path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z"/><path d="M9.5 14l2 2 3.5-3.5"/> }
        @case ('nuvem-off') { <path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z"/><path d="M4 4l16 16"/> }
        @case ('sair') { <path d="M10 5H5v14h5"/><path d="M14 8l4 4-4 4"/><path d="M18 12H9"/> }
        @case ('voltar') { <path d="M15 5l-7 7 7 7"/> }
        @case ('busca') { <circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/> }
        @case ('certo') { <path d="M5 12.5l4.5 4.5L19 7.5"/> }
        @case ('relogio') { <circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/> }
        @case ('atencao') { <path d="M12 4l9 16H3L12 4z"/><path d="M12 10v4"/><path d="M12 17v.5"/> }
        @case ('pessoa') { <circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/> }
        @case ('mais') { <path d="M12 5v14M5 12h14"/> }
        @case ('menos') { <path d="M5 12h14"/> }
        @case ('dinheiro') { <rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/> }
        @case ('cartao') { <rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/> }
        @case ('pix') { <path d="M12 3l9 9-9 9-9-9 9-9z"/> }
        @case ('casa') { <path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/> }
      }
    </svg>
  `,
})
export class Icone {
  readonly nome = input.required<NomeIcone>();
  readonly tamanho = input(28);
}
