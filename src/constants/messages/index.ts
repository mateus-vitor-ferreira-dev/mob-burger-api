export const MSG = {
  auth: {
    invalidCredentials: 'E-mail ou senha inválidos.',
    unauthorized: 'Não autorizado. Faça login para continuar.',
    forbidden: 'Você não tem permissão para realizar esta ação.',
    tokenExpired: 'Sessão expirada. Faça login novamente.',
  },
  order: {
    notFound: 'Pedido não encontrado.',
    storeClosed: 'A loja está fechada no momento. Tente novamente durante o horário de funcionamento.',
    pixExpired: 'O QR Code Pix expirou. Por favor, refaça o pedido.',
    created: 'Pedido criado com sucesso.',
    statusUpdated: 'Status do pedido atualizado.',
    invalidStatus: 'Transição de status inválida.',
  },
  menu: {
    productNotFound: 'Produto não encontrado.',
    categoryNotFound: 'Categoria não encontrada.',
    productUnavailable: 'Este produto não está disponível no momento.',
    created: 'Produto criado com sucesso.',
    updated: 'Produto atualizado com sucesso.',
    deleted: 'Produto removido com sucesso.',
  },
  payment: {
    webhookInvalid: 'Assinatura do webhook inválida.',
    paymentFailed: 'Falha no processamento do pagamento.',
    alreadyPaid: 'Este pedido já foi pago.',
  },
  common: {
    internalError: 'Erro interno do servidor.',
    validationError: 'Dados inválidos. Verifique os campos e tente novamente.',
    notFound: 'Recurso não encontrado.',
  },
} as const;
