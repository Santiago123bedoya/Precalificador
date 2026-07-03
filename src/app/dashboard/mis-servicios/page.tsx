"use client";

import { ServiciosForm } from "@/components/servicios/ServiciosForm";
import { motion } from "framer-motion";

export default function MisServiciosPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <ServiciosForm />
    </motion.div>
  );
}
