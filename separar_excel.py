import pandas as pd
import os
import sys

# Configurar la codificación para Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())

def separar_excel_a_csv(archivo_excel):
    """
    Separa un archivo Excel en archivos CSV individuales, uno por cada hoja.
    
    Args:
        archivo_excel (str): Ruta al archivo Excel
    """
    try:
        # Leer todas las hojas del archivo Excel
        excel_file = pd.ExcelFile(archivo_excel)
        
        print(f"Archivo Excel encontrado: {archivo_excel}")
        print(f"Hojas disponibles: {excel_file.sheet_names}")
        print(f"Total de hojas: {len(excel_file.sheet_names)}")
        print("-" * 50)
        
        # Obtener el directorio base y nombre del archivo sin extensión
        directorio_base = os.path.dirname(archivo_excel)
        nombre_base = os.path.splitext(os.path.basename(archivo_excel))[0]
        
        # Procesar cada hoja
        for nombre_hoja in excel_file.sheet_names:
            print(f"Procesando hoja: {nombre_hoja}")
            
            # Leer la hoja específica
            df = pd.read_excel(archivo_excel, sheet_name=nombre_hoja)
            
            # Crear nombre del archivo CSV
            nombre_csv = f"{nombre_base}_{nombre_hoja}.csv"
            ruta_csv = os.path.join(directorio_base, nombre_csv)
            
            # Guardar como CSV
            df.to_csv(ruta_csv, index=False, encoding='utf-8')
            
            print(f"  -> Guardado como: {nombre_csv}")
            print(f"  -> Filas: {len(df)}, Columnas: {len(df.columns)}")
            print()
        
        print("Proceso completado exitosamente!")
        print(f"Se generaron {len(excel_file.sheet_names)} archivos CSV")
        
    except FileNotFoundError:
        print(f"Error: No se encontro el archivo {archivo_excel}")
    except Exception as e:
        print(f"Error inesperado: {str(e)}")

if __name__ == "__main__":
    # Ruta al archivo Excel
    archivo_excel = "DataGenesis.xlsx"
    
    # Verificar si el archivo existe
    if os.path.exists(archivo_excel):
        separar_excel_a_csv(archivo_excel)
    else:
        print(f"El archivo {archivo_excel} no existe en el directorio actual")
        print("Archivos disponibles en el directorio:")
        for archivo in os.listdir("."):
            if archivo.endswith((".xlsx", ".xls")):
                print(f"  - {archivo}")
