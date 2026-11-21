export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      apoderados: {
        Row: {
          correo: string
          created_at: string
          dni: string
          id: string
          nombre: string
          telefono: string
          user_id: string | null
        }
        Insert: {
          correo?: string
          created_at?: string
          dni: string
          id?: string
          nombre: string
          telefono?: string
          user_id?: string | null
        }
        Update: {
          correo?: string
          created_at?: string
          dni?: string
          id?: string
          nombre?: string
          telefono?: string
          user_id?: string | null
        }
        Relationships: []
      }
      asistencias: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_asistencia"]
          fecha: string
          id: string
          matricula_id: string
          observacion: string
          registrado_por: string | null
          seccion_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_asistencia"]
          fecha: string
          id?: string
          matricula_id: string
          observacion?: string
          registrado_por?: string | null
          seccion_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_asistencia"]
          fecha?: string
          id?: string
          matricula_id?: string
          observacion?: string
          registrado_por?: string | null
          seccion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asistencias_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_seccion_id_fkey"
            columns: ["seccion_id"]
            isOneToOne: false
            referencedRelation: "secciones"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          accion: string
          created_at: string
          datos: Json
          id: number
          registro_id: string | null
          tabla: string
          usuario_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          datos?: Json
          id?: number
          registro_id?: string | null
          tabla: string
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          datos?: Json
          id?: number
          registro_id?: string | null
          tabla?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      documentos: {
        Row: {
          archivo_path: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_documento"]
          id: string
          matricula_id: string
          nombre_archivo: string
          observacion: string
          subido_por: string | null
          tipo: string
        }
        Insert: {
          archivo_path: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_documento"]
          id?: string
          matricula_id: string
          nombre_archivo?: string
          observacion?: string
          subido_por?: string | null
          tipo: string
        }
        Update: {
          archivo_path?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_documento"]
          id?: string
          matricula_id?: string
          nombre_archivo?: string
          observacion?: string
          subido_por?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      estudiantes: {
        Row: {
          apellidos: string
          apoderado_id: string
          codigo_qr: string
          created_at: string
          dni: string
          fecha_nacimiento: string | null
          id: string
          nombres: string
          user_id: string | null
        }
        Insert: {
          apellidos: string
          apoderado_id: string
          codigo_qr?: string
          created_at?: string
          dni: string
          fecha_nacimiento?: string | null
          id?: string
          nombres: string
          user_id?: string | null
        }
        Update: {
          apellidos?: string
          apoderado_id?: string
          codigo_qr?: string
          created_at?: string
          dni?: string
          fecha_nacimiento?: string | null
          id?: string
          nombres?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estudiantes_apoderado_id_fkey"
            columns: ["apoderado_id"]
            isOneToOne: false
            referencedRelation: "apoderados"
            referencedColumns: ["id"]
          },
        ]
      }
      grados: {
        Row: {
          id: string
          nivel: string
          numero: number
          orden: number
        }
        Insert: {
          id?: string
          nivel: string
          numero: number
          orden?: number
        }
        Update: {
          id?: string
          nivel?: string
          numero?: number
          orden?: number
        }
        Relationships: []
      }
      justificaciones: {
        Row: {
          asistencia_id: string
          created_at: string
          estado_revision: Database["public"]["Enums"]["estado_revision"]
          id: string
          motivo: string
          observacion: string
          presentado_por: string | null
          revisado_en: string | null
          revisado_por: string | null
          sustento_path: string | null
        }
        Insert: {
          asistencia_id: string
          created_at?: string
          estado_revision?: Database["public"]["Enums"]["estado_revision"]
          id?: string
          motivo: string
          observacion?: string
          presentado_por?: string | null
          revisado_en?: string | null
          revisado_por?: string | null
          sustento_path?: string | null
        }
        Update: {
          asistencia_id?: string
          created_at?: string
          estado_revision?: Database["public"]["Enums"]["estado_revision"]
          id?: string
          motivo?: string
          observacion?: string
          presentado_por?: string | null
          revisado_en?: string | null
          revisado_por?: string | null
          sustento_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "justificaciones_asistencia_id_fkey"
            columns: ["asistencia_id"]
            isOneToOne: true
            referencedRelation: "asistencias"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas: {
        Row: {
          codigo: number
          confirmada_en: string | null
          confirmada_por: string | null
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_matricula"]
          estudiante_id: string
          grado_id: string
          id: string
          observacion: string
          periodo_id: string
          seccion_id: string | null
          tipo: Database["public"]["Enums"]["tipo_matricula"]
          updated_at: string
        }
        Insert: {
          codigo?: number
          confirmada_en?: string | null
          confirmada_por?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_matricula"]
          estudiante_id: string
          grado_id: string
          id?: string
          observacion?: string
          periodo_id: string
          seccion_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_matricula"]
          updated_at?: string
        }
        Update: {
          codigo?: number
          confirmada_en?: string | null
          confirmada_por?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_matricula"]
          estudiante_id?: string
          grado_id?: string
          id?: string
          observacion?: string
          periodo_id?: string
          seccion_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_matricula"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_grado_id_fkey"
            columns: ["grado_id"]
            isOneToOne: false
            referencedRelation: "grados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_seccion_id_fkey"
            columns: ["seccion_id"]
            isOneToOne: false
            referencedRelation: "secciones"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          apoderado_id: string
          asunto: string
          canal: string
          created_at: string
          estado_envio: string
          estudiante_id: string | null
          id: string
          leida: boolean
          mensaje: string
        }
        Insert: {
          apoderado_id: string
          asunto: string
          canal?: string
          created_at?: string
          estado_envio?: string
          estudiante_id?: string | null
          id?: string
          leida?: boolean
          mensaje: string
        }
        Update: {
          apoderado_id?: string
          asunto?: string
          canal?: string
          created_at?: string
          estado_envio?: string
          estudiante_id?: string | null
          id?: string
          leida?: boolean
          mensaje?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_apoderado_id_fkey"
            columns: ["apoderado_id"]
            isOneToOne: false
            referencedRelation: "apoderados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          comprobante: string
          concepto: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_pago"]
          fecha: string
          id: string
          matricula_id: string
          monto: number
          registrado_por: string | null
        }
        Insert: {
          comprobante?: string
          concepto?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pago"]
          fecha?: string
          id?: string
          matricula_id: string
          monto: number
          registrado_por?: string | null
        }
        Update: {
          comprobante?: string
          concepto?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pago"]
          fecha?: string
          id?: string
          matricula_id?: string
          monto?: number
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      periodos: {
        Row: {
          activo: boolean
          anio: number
          created_at: string
          fin_matricula: string
          hora_tardanza: string
          id: string
          inicio_matricula: string
          monto_matricula: number
        }
        Insert: {
          activo?: boolean
          anio: number
          created_at?: string
          fin_matricula: string
          hora_tardanza?: string
          id?: string
          inicio_matricula: string
          monto_matricula?: number
        }
        Update: {
          activo?: boolean
          anio?: number
          created_at?: string
          fin_matricula?: string
          hora_tardanza?: string
          id?: string
          inicio_matricula?: string
          monto_matricula?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          correo: string
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          correo?: string
          created_at?: string
          id: string
          nombre?: string
        }
        Update: {
          correo?: string
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      reclamos: {
        Row: {
          apoderado_id: string | null
          asunto: string
          codigo: number
          created_at: string
          detalle: string
          estado: string
          estudiante_id: string | null
          id: string
          pedido: string
          respondido_en: string | null
          respondido_por: string | null
          respuesta: string
          tipo: string
          usuario_id: string
        }
        Insert: {
          apoderado_id?: string | null
          asunto: string
          codigo?: number
          created_at?: string
          detalle: string
          estado?: string
          estudiante_id?: string | null
          id?: string
          pedido?: string
          respondido_en?: string | null
          respondido_por?: string | null
          respuesta?: string
          tipo: string
          usuario_id?: string
        }
        Update: {
          apoderado_id?: string | null
          asunto?: string
          codigo?: number
          created_at?: string
          detalle?: string
          estado?: string
          estudiante_id?: string | null
          id?: string
          pedido?: string
          respondido_en?: string | null
          respondido_por?: string | null
          respuesta?: string
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reclamos_apoderado_id_fkey"
            columns: ["apoderado_id"]
            isOneToOne: false
            referencedRelation: "apoderados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamos_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
        ]
      }
      secciones: {
        Row: {
          capacidad: number
          created_at: string
          docente_id: string | null
          grado_id: string
          id: string
          nombre: string
          ocupadas: number
          periodo_id: string
        }
        Insert: {
          capacidad?: number
          created_at?: string
          docente_id?: string | null
          grado_id: string
          id?: string
          nombre: string
          ocupadas?: number
          periodo_id: string
        }
        Update: {
          capacidad?: number
          created_at?: string
          docente_id?: string | null
          grado_id?: string
          id?: string
          nombre?: string
          ocupadas?: number
          periodo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secciones_grado_id_fkey"
            columns: ["grado_id"]
            isOneToOne: false
            referencedRelation: "grados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secciones_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cambiar_estado_matricula: {
        Args: {
          _estado: Database["public"]["Enums"]["estado_matricula"]
          _matricula_id: string
          _motivo: string
        }
        Returns: {
          codigo: number
          confirmada_en: string | null
          confirmada_por: string | null
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_matricula"]
          estudiante_id: string
          grado_id: string
          id: string
          observacion: string
          periodo_id: string
          seccion_id: string | null
          tipo: Database["public"]["Enums"]["tipo_matricula"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "matriculas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cerrar_asistencia_qr: { Args: { _seccion_id: string }; Returns: Json }
      confirmar_matricula: {
        Args: { _matricula_id: string; _seccion_id: string }
        Returns: {
          codigo: number
          confirmada_en: string | null
          confirmada_por: string | null
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_matricula"]
          estudiante_id: string
          grado_id: string
          id: string
          observacion: string
          periodo_id: string
          seccion_id: string | null
          tipo: Database["public"]["Enums"]["tipo_matricula"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "matriculas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      documentos_requeridos: {
        Args: { _tipo: Database["public"]["Enums"]["tipo_matricula"] }
        Returns: string[]
      }
      es_apoderado_de_estudiante: {
        Args: { _estudiante_id: string; _user_id: string }
        Returns: boolean
      }
      es_apoderado_de_matricula: {
        Args: { _matricula_id: string; _user_id: string }
        Returns: boolean
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      marcar_asistencia_qr: {
        Args: { _codigo: string; _seccion_id: string }
        Returns: Json
      }
      notificar_apoderado: {
        Args: { _asunto: string; _estudiante_id: string; _mensaje: string }
        Returns: undefined
      }
      puede_tomar_asistencia: {
        Args: { _s: Database["public"]["Tables"]["secciones"]["Row"] }
        Returns: boolean
      }
      puede_ver_estudiante: {
        Args: { _estudiante_id: string; _user_id: string }
        Returns: boolean
      }
      puede_ver_matricula: {
        Args: { _matricula_id: string; _user_id: string }
        Returns: boolean
      }
      registrar_asistencia: {
        Args: { _fecha: string; _marcas: Json; _seccion_id: string }
        Returns: Json
      }
      registrar_auditoria: {
        Args: {
          _accion: string
          _datos: Json
          _registro: string
          _tabla: string
        }
        Returns: undefined
      }
      resolver_justificacion: {
        Args: {
          _aprobar: boolean
          _justificacion_id: string
          _observacion: string
        }
        Returns: {
          asistencia_id: string
          created_at: string
          estado_revision: Database["public"]["Enums"]["estado_revision"]
          id: string
          motivo: string
          observacion: string
          presentado_por: string | null
          revisado_en: string | null
          revisado_por: string | null
          sustento_path: string | null
        }
        SetofOptions: {
          from: "*"
          to: "justificaciones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      responder_reclamo: {
        Args: { _estado: string; _reclamo_id: string; _respuesta: string }
        Returns: {
          apoderado_id: string | null
          asunto: string
          codigo: number
          created_at: string
          detalle: string
          estado: string
          estudiante_id: string | null
          id: string
          pedido: string
          respondido_en: string | null
          respondido_por: string | null
          respuesta: string
          tipo: string
          usuario_id: string
        }
        SetofOptions: {
          from: "*"
          to: "reclamos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      vincular_apoderado: {
        Args: { _dni: string; _nombre: string; _telefono: string }
        Returns: {
          correo: string
          created_at: string
          dni: string
          id: string
          nombre: string
          telefono: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "apoderados"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "secretaria"
        | "tesoreria"
        | "director"
        | "docente"
        | "auxiliar"
        | "apoderado"
        | "estudiante"
      estado_asistencia: "PRESENTE" | "TARDANZA" | "FALTA" | "JUSTIFICADA"
      estado_documento: "PENDIENTE" | "VALIDADO" | "OBSERVADO"
      estado_matricula:
        | "SOLICITADA"
        | "EN_REVISION"
        | "MATRICULADA"
        | "RECHAZADA"
        | "RETIRADA"
        | "ANULADA"
      estado_pago: "CONFIRMADO" | "ANULADO"
      estado_revision: "PENDIENTE" | "APROBADA" | "RECHAZADA"
      tipo_matricula: "NUEVA" | "RATIFICACION" | "TRASLADO"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "secretaria",
        "tesoreria",
        "director",
        "docente",
        "auxiliar",
        "apoderado",
        "estudiante",
      ],
      estado_asistencia: ["PRESENTE", "TARDANZA", "FALTA", "JUSTIFICADA"],
      estado_documento: ["PENDIENTE", "VALIDADO", "OBSERVADO"],
      estado_matricula: [
        "SOLICITADA",
        "EN_REVISION",
        "MATRICULADA",
        "RECHAZADA",
        "RETIRADA",
        "ANULADA",
      ],
      estado_pago: ["CONFIRMADO", "ANULADO"],
      estado_revision: ["PENDIENTE", "APROBADA", "RECHAZADA"],
      tipo_matricula: ["NUEVA", "RATIFICACION", "TRASLADO"],
    },
  },
} as const
