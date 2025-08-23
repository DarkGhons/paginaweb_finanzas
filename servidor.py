#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import os
import sys

def iniciar_servidor(puerto=8000):
    """
    Inicia un servidor HTTP local para servir la página web
    """
    try:
        # Cambiar al directorio del script
        directorio_actual = os.path.dirname(os.path.abspath(__file__))
        os.chdir(directorio_actual)
        
        # Configurar el servidor
        handler = http.server.SimpleHTTPRequestHandler
        
        # Añadir headers CORS para permitir carga de archivos CSV
        class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
            def end_headers(self):
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', '*')
                super().end_headers()
        
        with socketserver.TCPServer(("", puerto), CORSRequestHandler) as httpd:
            url = f"http://localhost:{puerto}"
            
            print(f"Servidor iniciado en: {url}")
            print(f"Sirviendo archivos desde: {directorio_actual}")
            print("\nArchivos disponibles:")
            for archivo in os.listdir("."):
                if archivo.endswith((".html", ".css", ".js", ".csv")):
                    print(f"  - {archivo}")
            
            print(f"\nAbre tu navegador en: {url}")
            print("Presiona Ctrl+C para detener el servidor")
            
            # Intentar abrir automáticamente el navegador
            try:
                webbrowser.open(url)
                print("Abriendo navegador automáticamente...")
            except:
                print("No se pudo abrir el navegador automáticamente")
            
            # Iniciar el servidor
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\nServidor detenido")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"El puerto {puerto} ya está en uso. Intentando con puerto {puerto + 1}")
            iniciar_servidor(puerto + 1)
        else:
            print(f"Error al iniciar servidor: {e}")

if __name__ == "__main__":
    puerto = 8000
    if len(sys.argv) > 1:
        try:
            puerto = int(sys.argv[1])
        except ValueError:
            print("Puerto inválido, usando puerto 8000")
    
    iniciar_servidor(puerto)
