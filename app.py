#!/usr/bin/env python3
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import os
import json
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)

# Configuración de archivos CSV
CSV_FILES = {
    'movimientos': 'fact_movimientos.csv',
    'categorias': 'dim_categorias.csv',
    'contrapartes': 'dim_contrapartes.csv',
    'cuentas': 'dim_cuentas.csv',
    'instrumentos': 'dim_instrumentos.csv',
    'prestamos': 'dim_prestamos.csv'
}

def load_csv(filename):
    """Cargar archivo CSV y manejar errores"""
    try:
        if os.path.exists(filename):
            # Cargar el CSV y reemplazar NaN con None para JSON
            df = pd.read_csv(filename)
            return df.where(pd.notnull(df), None)
        else:
            return pd.DataFrame()
    except Exception as pd_err:
        print(f"Error cargando {filename}: {pd_err}")
        # Intentar cargar manualmente si hay un error con pandas
        try:
            import csv
            with open(filename, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                data = [row for row in reader]
            return pd.DataFrame(data).replace('', None)
        except Exception as csv_err:
            print(f"Error cargando {filename} manualmente: {csv_err}")
            return pd.DataFrame()

def save_csv(df, filename):
    """Guardar DataFrame a CSV"""
    try:
        df.to_csv(filename, index=False)
        return True
    except Exception as e:
        print(f"Error guardando {filename}: {e}")
        return False

def generate_mov_id():
    """Generar ID único para movimiento"""
    today = datetime.now()
    date_str = today.strftime("%Y%m%d")
    
    # Cargar movimientos existentes para obtener el siguiente número
    df = load_csv(CSV_FILES['movimientos'])
    if not df.empty:
        existing_ids = df[df['mov_id'].str.startswith(date_str)]['mov_id'].tolist()
        if existing_ids:
            numbers = [int(id.split('-')[1]) for id in existing_ids if '-' in id]
            next_num = max(numbers) + 1 if numbers else 1
        else:
            next_num = 1
    else:
        next_num = 1
    
    return f"{date_str}-{next_num:03d}"

# Servir archivos estáticos
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

# ENDPOINTS PARA MOVIMIENTOS
@app.route('/api/movimientos', methods=['GET'])
def get_movimientos():
    """Obtener todos los movimientos"""
    try:
        df = load_csv(CSV_FILES['movimientos'])
        # Convertir NaN a None para cada registro
        records = []
        for _, row in df.iterrows():
            record = {}
            for col in df.columns:
                value = row[col]
                record[col] = None if pd.isna(value) else value
            records.append(record)
        return jsonify(records)
    except Exception as e:
        print(f"Error en get_movimientos: {str(e)}")
        return jsonify({'error': 'Error al cargar los movimientos'}), 500

@app.route('/api/movimientos', methods=['POST'])
def create_movimiento():
    """Crear nuevo movimiento"""
    try:
        data = request.get_json()
        
        # Validar datos requeridos
        required_fields = ['fecha', 'descripcion', 'monto', 'moneda']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo requerido: {field}'}), 400
        
        # Cargar datos existentes
        df = load_csv(CSV_FILES['movimientos'])
        
        # Generar ID único
        mov_id = generate_mov_id()
        
        # Preparar nuevo registro
        fecha = datetime.strptime(data['fecha'], '%Y-%m-%d')
        nuevo_movimiento = {
            'mov_id': mov_id,
            'fecha': data['fecha'],
            'mes': fecha.month,
            'anio': fecha.year,
            'cuenta_id': data.get('cuenta_id', ''),
            'contraparte_id': data.get('contraparte_id', ''),
            'categoria_id': data.get('categoria_id', ''),
            'instrumento_id': data.get('instrumento_id', ''),
            'descripcion': data['descripcion'],
            'monto': float(data['monto']),
            'moneda': data['moneda'],
            'tasa_cambio': data.get('tasa_cambio', '')
        }
        
        # Añadir al DataFrame
        if df.empty:
            df = pd.DataFrame([nuevo_movimiento])
        else:
            df = pd.concat([df, pd.DataFrame([nuevo_movimiento])], ignore_index=True)
        
        # Guardar archivo
        if save_csv(df, CSV_FILES['movimientos']):
            return jsonify({'message': 'Movimiento creado exitosamente', 'mov_id': mov_id}), 201
        else:
            return jsonify({'error': 'Error al guardar el movimiento'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500

@app.route('/api/movimientos/<mov_id>', methods=['PUT'])
def update_movimiento(mov_id):
    """Actualizar movimiento existente"""
    try:
        data = request.get_json()
        df = load_csv(CSV_FILES['movimientos'])
        
        if df.empty:
            return jsonify({'error': 'No se encontraron movimientos'}), 404
        
        # Buscar el movimiento
        mask = df['mov_id'] == mov_id
        if not mask.any():
            return jsonify({'error': 'Movimiento no encontrado'}), 404
        
        # Actualizar campos
        for field, value in data.items():
            if field in df.columns and field != 'mov_id':
                if field == 'fecha':
                    fecha = datetime.strptime(value, '%Y-%m-%d')
                    df.loc[mask, 'mes'] = fecha.month
                    df.loc[mask, 'anio'] = fecha.year
                df.loc[mask, field] = value
        
        # Guardar archivo
        if save_csv(df, CSV_FILES['movimientos']):
            return jsonify({'message': 'Movimiento actualizado exitosamente'})
        else:
            return jsonify({'error': 'Error al guardar el movimiento'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500

@app.route('/api/movimientos/<mov_id>', methods=['DELETE'])
def delete_movimiento(mov_id):
    """Eliminar movimiento"""
    try:
        df = load_csv(CSV_FILES['movimientos'])
        
        if df.empty:
            return jsonify({'error': 'No se encontraron movimientos'}), 404
        
        # Buscar y eliminar el movimiento
        initial_count = len(df)
        df = df[df['mov_id'] != mov_id]
        
        if len(df) == initial_count:
            return jsonify({'error': 'Movimiento no encontrado'}), 404
        
        # Guardar archivo
        if save_csv(df, CSV_FILES['movimientos']):
            return jsonify({'message': 'Movimiento eliminado exitosamente'})
        else:
            return jsonify({'error': 'Error al guardar los cambios'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500

# ENDPOINTS PARA DIMENSIONES
@app.route('/api/<dimension>', methods=['GET'])
def get_dimension(dimension):
    """Obtener datos de dimensión"""
    try:
        if dimension not in CSV_FILES:
            return jsonify({'error': 'Dimensión no válida'}), 400
        
        df = load_csv(CSV_FILES[dimension])
        # Convertir NaN a None para cada registro
        records = []
        for _, row in df.iterrows():
            record = {}
            for col in df.columns:
                value = row[col]
                record[col] = None if pd.isna(value) else value
            records.append(record)
        return jsonify(records)
    except Exception as e:
        print(f"Error en get_dimension({dimension}): {str(e)}")
        return jsonify({'error': f'Error al cargar la dimensión {dimension}'}), 500

@app.route('/api/<dimension>', methods=['POST'])
def create_dimension_record(dimension):
    """Crear registro en dimensión"""
    try:
        if dimension not in CSV_FILES:
            return jsonify({'error': 'Dimensión no válida'}), 400
        
        data = request.get_json()
        df = load_csv(CSV_FILES[dimension])
        
        # Añadir nuevo registro
        if df.empty:
            df = pd.DataFrame([data])
        else:
            df = pd.concat([df, pd.DataFrame([data])], ignore_index=True)
        
        # Guardar archivo
        if save_csv(df, CSV_FILES[dimension]):
            return jsonify({'message': f'Registro creado en {dimension}'}), 201
        else:
            return jsonify({'error': 'Error al guardar el registro'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500

@app.route('/api/<dimension>/<record_id>', methods=['PUT'])
def update_dimension_record(dimension, record_id):
    """Actualizar registro en dimensión"""
    try:
        if dimension not in CSV_FILES:
            return jsonify({'error': 'Dimensión no válida'}), 400
        
        data = request.get_json()
        df = load_csv(CSV_FILES[dimension])
        
        if df.empty:
            return jsonify({'error': 'No se encontraron registros'}), 404
        
        # Determinar columna ID según la dimensión
        id_column = f"{dimension[:-1]}_id" if dimension.endswith('s') else f"{dimension}_id"
        if id_column not in df.columns:
            id_column = df.columns[0]  # Usar primera columna como ID
        
        # Buscar y actualizar registro
        mask = df[id_column] == record_id
        if not mask.any():
            return jsonify({'error': 'Registro no encontrado'}), 404
        
        for field, value in data.items():
            if field in df.columns:
                df.loc[mask, field] = value
        
        # Guardar archivo
        if save_csv(df, CSV_FILES[dimension]):
            return jsonify({'message': f'Registro actualizado en {dimension}'})
        else:
            return jsonify({'error': 'Error al guardar el registro'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500

@app.route('/api/<dimension>/<record_id>', methods=['DELETE'])
def delete_dimension_record(dimension, record_id):
    """Eliminar registro de dimensión"""
    try:
        if dimension not in CSV_FILES:
            return jsonify({'error': 'Dimensión no válida'}), 400
        
        df = load_csv(CSV_FILES[dimension])
        
        if df.empty:
            return jsonify({'error': 'No se encontraron registros'}), 404
        
        # Determinar columna ID
        id_column = f"{dimension[:-1]}_id" if dimension.endswith('s') else f"{dimension}_id"
        if id_column not in df.columns:
            id_column = df.columns[0]
        
        # Eliminar registro
        initial_count = len(df)
        df = df[df[id_column] != record_id]
        
        if len(df) == initial_count:
            return jsonify({'error': 'Registro no encontrado'}), 404
        
        # Guardar archivo
        if save_csv(df, CSV_FILES[dimension]):
            return jsonify({'message': f'Registro eliminado de {dimension}'})
        else:
            return jsonify({'error': 'Error al guardar los cambios'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500

# Endpoint de salud
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'OK', 'message': 'Servidor funcionando correctamente'})

if __name__ == '__main__':
    print("Iniciando servidor Flask...")
    print("Endpoints disponibles:")
    print("  GET    /api/movimientos")
    print("  POST   /api/movimientos")
    print("  PUT    /api/movimientos/<mov_id>")
    print("  DELETE /api/movimientos/<mov_id>")
    print("  GET    /api/<dimension>")
    print("  POST   /api/<dimension>")
    print("  PUT    /api/<dimension>/<record_id>")
    print("  DELETE /api/<dimension>/<record_id>")
    print("\nDimensiones disponibles: categorias, contrapartes, cuentas, instrumentos, prestamos")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
