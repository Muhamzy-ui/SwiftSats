"""
Tests for Order State Machine and transitions.
"""
from decimal import Decimal
from datetime import timedelta
import pytest
from django.utils import timezone
from apps.orders.models import Order
from apps.orders.state_machine import OrderStateMachine
from apps.audit.models import AuditLog
from core.constants import OrderStatus, SupportedCoin, BlockchainNetwork, AuditActor
from core.exceptions import StateTransitionError


@pytest.mark.django_db
class TestOrderStateMachine:
    """Test suite for order lifecycle transitions."""

    @pytest.fixture
    def initial_order(self):
        return Order.objects.create(
            coin=SupportedCoin.USDT_TRC20,
            network=BlockchainNetwork.TRC20,
            fiat_amount_ngn=Decimal("50000.00"),
            crypto_amount=Decimal("31.50"),
            quote_rate=Decimal("1585.50"),
            wallet_address="TXxxMockTronAddressValid123456789",
            status=OrderStatus.QUOTE_LOCKED,
            quote_expires_at=timezone.now() + timedelta(seconds=90),
        )

    def test_valid_forward_flow(self, initial_order):
        """Test full successful lifecycle: QUOTE_LOCKED -> AWAITING_PAYMENT -> PAYMENT_CONFIRMED -> PAYOUT_PROCESSING -> COMPLETED"""
        order = initial_order

        # 1. QUOTE_LOCKED -> AWAITING_PAYMENT
        order = OrderStateMachine.transition_to(
            order=order,
            target_state=OrderStatus.AWAITING_PAYMENT,
            actor=AuditActor.PUBLIC_USER,
            virtual_bank_name="Wema Bank",
            virtual_account_number="9912345678",
        )
        assert order.status == OrderStatus.AWAITING_PAYMENT
        assert order.virtual_account_number == "9912345678"

        # 2. AWAITING_PAYMENT -> PAYMENT_CONFIRMED
        order = OrderStateMachine.transition_to(
            order=order,
            target_state=OrderStatus.PAYMENT_CONFIRMED,
            actor=AuditActor.SYSTEM_WEBHOOK,
            paystack_reference="PSTK_TEST_123",
        )
        assert order.status == OrderStatus.PAYMENT_CONFIRMED
        assert order.payment_received_at is not None

        # 3. PAYMENT_CONFIRMED -> PAYOUT_PROCESSING
        order = OrderStateMachine.transition_to(
            order=order,
            target_state=OrderStatus.PAYOUT_PROCESSING,
            actor=AuditActor.CELERY_WORKER,
        )
        assert order.status == OrderStatus.PAYOUT_PROCESSING
        assert order.payout_initiated_at is not None

        # 4. PAYOUT_PROCESSING -> COMPLETED
        order = OrderStateMachine.transition_to(
            order=order,
            target_state=OrderStatus.COMPLETED,
            actor=AuditActor.CELERY_WORKER,
            tx_hash="0xabcdef1234567890",
            speed_metric_ms=3420,
        )
        assert order.status == OrderStatus.COMPLETED
        assert order.completed_at is not None
        assert order.tx_hash == "0xabcdef1234567890"

        # Verify Audit Logs
        logs = AuditLog.objects.filter(order_reference=order.order_reference)
        assert logs.count() == 4

    def test_illegal_state_transition_raises_error(self, initial_order):
        """Test that skipping states (e.g. QUOTE_LOCKED directly to COMPLETED) is strictly rejected."""
        with pytest.raises(StateTransitionError) as exc_info:
            OrderStateMachine.transition_to(
                order=initial_order,
                target_state=OrderStatus.COMPLETED,
                actor=AuditActor.PUBLIC_USER,
            )
        assert "Cannot transition order" in str(exc_info.value)

    def test_completed_is_terminal(self, initial_order):
        """Test that a COMPLETED order cannot be transitioned to anything else."""
        order = OrderStateMachine.transition_to(order=initial_order, target_state=OrderStatus.AWAITING_PAYMENT)
        order = OrderStateMachine.transition_to(order=order, target_state=OrderStatus.PAYMENT_CONFIRMED)
        order = OrderStateMachine.transition_to(order=order, target_state=OrderStatus.PAYOUT_PROCESSING)
        order = OrderStateMachine.transition_to(order=order, target_state=OrderStatus.COMPLETED)

        with pytest.raises(StateTransitionError):
            OrderStateMachine.transition_to(order=order, target_state=OrderStatus.FAILED)
