export type NetworkActionType = 
  | 'ROLL_DICE'
  | 'MOVE_PATH'
  | 'EVENT_CHOICE'
  | 'CHEST_ROLL'
  | 'SHOP_ACTION'
  | 'BATTLE_ACTION'
  | 'END_TURN';

export interface NetworkActionPayload {
  type: NetworkActionType;
  playerIndex: number;
  data: any;
  timestamp: number;
}
