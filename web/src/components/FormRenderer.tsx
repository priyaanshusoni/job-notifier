"use client";

import { Form, Input, InputNumber, Select, Button, Row, Col } from "antd";
import type { FormInstance, Rule } from "antd/es/form";
import type { ReactNode } from "react";

export interface FormField {
  name: string;
  label: string;
  type: "text" | "password" | "textarea" | "number" | "select" | "multiselect";
  placeholder?: string;
  tooltip?: string;
  rules?: Rule[];
  options?: { label: string; value: string }[];
  colSpan?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputProps?: Record<string, any>;
}

interface FormRendererProps {
  fields: FormField[];
  onSubmit?: (values: Record<string, unknown>) => void;
  submitText?: string;
  submitIcon?: ReactNode;
  loading?: boolean;
  form?: FormInstance;
}

function renderInput(field: FormField) {
  const { type, placeholder, options, inputProps } = field;

  switch (type) {
    case "text":
      return <Input placeholder={placeholder} size="large" {...inputProps} />;
    case "password":
      return <Input.Password placeholder={placeholder} size="large" {...inputProps} />;
    case "textarea":
      return <Input.TextArea placeholder={placeholder} rows={3} style={{ resize: "none" }} {...inputProps} />;
    case "number":
      return <InputNumber placeholder={placeholder} size="large" style={{ width: "100%" }} min={0} {...inputProps} />;
    case "select":
      return <Select placeholder={placeholder} options={options} size="large" {...inputProps} />;
    case "multiselect":
      return <Select mode="multiple" placeholder={placeholder} options={options} size="large" allowClear {...inputProps} />;
  }
}

export function FormRenderer({
  fields,
  onSubmit,
  submitText = "Submit",
  submitIcon,
  loading,
  form,
}: FormRendererProps) {
  return (
    <Form form={form} layout="vertical" onFinish={onSubmit} requiredMark={false}>
      <Row gutter={16}>
        {fields.map((field) => (
          <Col key={field.name} span={field.colSpan ?? 24}>
            <Form.Item name={field.name} label={field.label} rules={field.rules} tooltip={field.tooltip}>
              {renderInput(field)}
            </Form.Item>
          </Col>
        ))}
      </Row>
      {onSubmit && (
        <Form.Item className="mb-0 mt-2">
          <Button type="primary" htmlType="submit" block size="large" loading={loading} icon={submitIcon}>
            {submitText}
          </Button>
        </Form.Item>
      )}
    </Form>
  );
}
