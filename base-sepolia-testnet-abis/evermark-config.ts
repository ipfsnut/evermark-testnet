
// Evermark Protocol Contract Configuration
export const EVERMARK_CONFIG = {
  network: "baseSepolia",
  chainId: 84532,
  contracts: {
    mockEmark: "0x0fCc19a2FF104F326d295CA6dDAF6Bf0548fCcf7",
    cardCatalog: "0x3E09D2367703b24B9E08d7582EfC28eD908e7e41",
    feeCollector: "0x3E192CFca27F62EA5322cCB06E69d7CCAb0D586D",
    evermarkRewards: "0x6A9e955499c37f7e725060bfDB00257010E95b41",
    evermarkNFT: "0x4223007Be8483AB960eAAD693eFa3aA71F3F1063",
    evermarkVoting: "0x53d44a46B789C6E70AA770090B32030D2bc641B7",
    nftStaking: "0x852c5cA39fD619C1a83e0d17A8aAC8F81ae184cE",
    evermarkLeaderboard: "0x95Db94e87877eFD2821b5CBE7C3eaf344628ff80",
    evermarkAuction: "0xABbb61652e17c7D8c546bFEA8777816882A5aE76"
  }
} as const;

export type ContractName = keyof typeof EVERMARK_CONFIG.contracts;
