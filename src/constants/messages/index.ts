export const MSG = {
  auth: {
    invalidCredentials: 'E-mail ou senha inválidos.',
    unauthorized: 'Não autorizado. Faça login para continuar.',
    forbidden: 'Você não tem permissão para realizar esta ação.',
    tokenExpired: 'Sessão expirada. Faça login novamente.',
    invalidRefreshToken: 'Token de refresh inválido ou expirado.',
  },
  customer: {
    emailAlreadyExists: 'Este e-mail já está cadastrado.',
    phoneRequired: 'Informe seu telefone para finalizar o pedido.',
    registered: 'Conta criada com sucesso.',
    googleLinked: 'Login realizado com sucesso via Google.',
    passwordNotSet: 'Esta conta usa login pelo Google. Acesse via Google.',
  },
  order: {
    notFound: 'Pedido não encontrado.',
    storeClosed:
      'A loja está fechada no momento. Tente novamente durante o horário de funcionamento.',
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
  coupon: {
    invalid: 'Cupom inválido ou inexistente.',
    inactive: 'Este cupom não está mais ativo.',
    notStarted: 'Este cupom ainda não está válido.',
    expired: 'Este cupom expirou.',
    exhausted: 'Este cupom esgotou o limite de usos.',
    dailyLimit: 'Limite diário deste cupom atingido.',
    userLimit: 'Você já utilizou este cupom o número máximo de vezes.',
    minValue: 'Valor mínimo do pedido não atingido para usar este cupom.',
  },
  common: {
    internalError: 'Erro interno do servidor.',
    validationError: 'Dados inválidos. Verifique os campos e tente novamente.',
    notFound: 'Recurso não encontrado.',
  },
} as const;
