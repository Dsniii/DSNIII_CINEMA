import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import jsQR from 'jsqr';
import { ResultadoValidacion } from '../models/resultado-validacion';
import { ResultadoValidacionTarjeta } from '../resultado-validacion/resultado-validacion';
import { Validacion } from '../servicios/validacion';

type EstadoCamara = 'inactiva' | 'iniciando' | 'activa' | 'error';

/** Ancho máximo al que se reduce cada cuadro antes de buscar el QR (más rápido, mismo resultado). */
const ANCHO_ANALISIS = 640;

/** Pantalla para validar entradas y productos escaneando el código QR con la cámara. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResultadoValidacionTarjeta, RouterLink],
  selector: 'app-escaner-qr',
  styleUrl: './escaner-qr.css',
  templateUrl: './escaner-qr.html',
})
export class EscanerQr {
  private readonly validacion = inject(Validacion);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  protected readonly camara = signal<EstadoCamara>('inactiva');
  protected readonly errorCamara = signal<string | null>(null);
  protected readonly validando = signal(false);
  protected readonly resultado = signal<ResultadoValidacion | null>(null);
  protected readonly errorValidacion = signal<string | null>(null);

  private flujo: MediaStream | null = null;
  private cuadro = 0;
  private lienzo: HTMLCanvasElement | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detener());
    // La cámara se enciende solo en el navegador, una vez que la pantalla ya se dibujó.
    afterNextRender(() => void this.iniciar());
  }

  /** Enciende la cámara trasera y empieza a buscar un QR. */
  protected async iniciar(): Promise<void> {
    if (!this.esNavegador) {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.camara.set('error');
      this.errorCamara.set('Este navegador no permite usar la cámara (se necesita HTTPS). Usá el ingreso manual.');
      return;
    }

    this.camara.set('iniciando');
    this.errorCamara.set(null);

    try {
      this.flujo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      const video = this.video().nativeElement;
      video.srcObject = this.flujo;
      await video.play();
      this.camara.set('activa');
      this.cuadro = requestAnimationFrame(this.ciclo);
    } catch (error) {
      this.detener();
      this.camara.set('error');
      this.errorCamara.set(this.mensajeCamara(error));
    }
  }

  /** Vuelve a escanear después de ver un resultado. */
  protected escanearOtro(): void {
    this.resultado.set(null);
    this.errorValidacion.set(null);
    if (this.camara() === 'activa') {
      this.cuadro = requestAnimationFrame(this.ciclo);
    } else {
      void this.iniciar();
    }
  }

  /** Mira un cuadro de la cámara; si encuentra un QR lo valida y se detiene hasta el próximo escaneo. */
  private readonly ciclo = (): void => {
    if (this.camara() !== 'activa') {
      return;
    }

    const video = this.video().nativeElement;
    if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      const escala = Math.min(1, ANCHO_ANALISIS / video.videoWidth);
      const ancho = Math.round(video.videoWidth * escala);
      const alto = Math.round(video.videoHeight * escala);

      const lienzo = (this.lienzo ??= document.createElement('canvas'));
      lienzo.width = ancho;
      lienzo.height = alto;
      const contexto = lienzo.getContext('2d', { willReadFrequently: true });

      if (contexto) {
        contexto.drawImage(video, 0, 0, ancho, alto);
        const imagen = contexto.getImageData(0, 0, ancho, alto);
        const qr = jsQR(imagen.data, ancho, alto, { inversionAttempts: 'dontInvert' });
        if (qr?.data) {
          void this.procesar(qr.data);
          return;
        }
      }
    }

    this.cuadro = requestAnimationFrame(this.ciclo);
  };

  private async procesar(texto: string): Promise<void> {
    this.validando.set(true);
    this.errorValidacion.set(null);
    navigator.vibrate?.(60);

    try {
      this.resultado.set(await this.validacion.validar(texto));
    } catch (error) {
      this.errorValidacion.set(error instanceof Error ? error.message : 'No se pudo validar el código.');
    } finally {
      this.validando.set(false);
    }
  }

  private detener(): void {
    cancelAnimationFrame(this.cuadro);
    this.flujo?.getTracks().forEach((pista) => pista.stop());
    this.flujo = null;
  }

  private mensajeCamara(error: unknown): string {
    const nombre = error instanceof DOMException ? error.name : '';
    if (nombre === 'NotAllowedError') {
      return 'No diste permiso para usar la cámara. Habilitalo en el navegador o usá el ingreso manual.';
    }
    if (nombre === 'NotFoundError') {
      return 'No encontramos una cámara en este dispositivo. Usá el ingreso manual.';
    }
    return 'No pudimos encender la cámara. Probá de nuevo o usá el ingreso manual.';
  }
}